import sys
import subprocess

# --- Auto-Install Missing Dependencies ---
def install(package):
    print(f"Auto-installing {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import sentence_transformers
except ImportError:
    install("sentence-transformers")
    install("torch")

try:
    from sklearn.ensemble import GradientBoostingRegressor
except ImportError:
    install("scikit-learn")

try:
    import pymongo
except ImportError:
    install("pymongo")
    install("dnspython")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pymongo
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sentence_transformers import SentenceTransformer, util
import os
import re
import json
import warnings
from typing import List, Optional, Any
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

load_dotenv('../backend/.env')

app = FastAPI(title="House Rental AI Recommendation Engine")

# Global NLP Model
print("Loading NLP Model (all-MiniLM-L6-v2)...")
nlp_model = SentenceTransformer('all-MiniLM-L6-v2')
print("NLP Model loaded.")

# Pre-compute persona query embeddings for consistent scoring
PERSONA_QUERIES = {
    'student': "budget friendly affordable flat for students near colleges hostels shared accommodation cheap rent study environment",
    'family': "spacious safe family home near schools parks peaceful quiet neighborhood children friendly garden large rooms",
    'professional': "modern premium flat near business hubs office metro station fast internet furnished professional working area"
}

PERSONA_EMBEDDINGS = {}
for persona, query in PERSONA_QUERIES.items():
    PERSONA_EMBEDDINGS[persona] = nlp_model.encode(query, convert_to_tensor=True)
print("Persona embeddings pre-computed.")

def get_mongo_db():
    client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
    return client['house_rent_db']

class Interaction(BaseModel):
    property_id: Optional[str] = None
    action_type: str
    metadata: Optional[Any] = None

class RecommendationRequest(BaseModel):
    user_id: str
    interactions: List[Interaction]

class PricePredictionRequest(BaseModel):
    location: str
    type: str

def normalize_text(text):
    if not text or not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'(\d+)\s*[-]*\s*bhk', r'\1bhk', text)
    text = re.sub(r'(\d+)\s*[-]*\s*rk', r'\1rk', text)
    return " ".join(text.split())

@app.post("/api/predict-price")
def predict_price(req: PricePredictionRequest):
    db = get_mongo_db()
    rows = list(db['properties'].find(
        {'status': {'$in': ['active', 'available']}, 'rent': {'$ne': None}},
        {'type': 1, 'location': 1, 'rent': 1}
    ))
    
    target_type = normalize_text(req.type)
    target_loc = normalize_text(req.location)
    
    # User's Base Rent Rules (midpoint approx for anchors)
    type_anchors = {
        '1rk': 7000,
        '1bhk': 12000,
        '2bhk': 22500,
        '3bhk': 35000,
        '4bhk': 50000,
        'villa': 70000,
        'studio': 9000
    }
    anchor_price = type_anchors.get(target_type, 15000)

    # Hard Price Caps (MANDATORY LIMITS)
    max_allowed_caps = {
        '1rk': 12000,
        '1bhk': 20000,
        '2bhk': 35000,
        '3bhk': 55000,
        '4bhk': 80000,
        'villa': 100000,
        'studio': 15000
    }
    
    max_limit = max_allowed_caps.get(target_type, anchor_price * 1.5)

    try:
        if not rows:
            return {"predicted_price": int(min(anchor_price, max_limit))}
            
        df = pd.DataFrame(rows)
        df['type'] = df['type'].apply(normalize_text)
        df['location'] = df['location'].apply(normalize_text)
        df['rent'] = pd.to_numeric(df['rent'], errors='coerce')
        df = df.dropna(subset=['rent'])
        
        # Filter extreme outliers from TRAINING DATA based on caps
        def get_max_cap(t):
            return max_allowed_caps.get(t, 200000)
            
        df['max_cap'] = df['type'].apply(get_max_cap)
        # Only train on realistic market data, ignore owner price gouging
        df = df[(df['rent'] >= 2000) & (df['rent'] <= df['max_cap'])]

        if len(df) < 2:
            return {"predicted_price": int(min(anchor_price, max_limit))}
            
        # Machine Learning Pipeline (Independent of Owner Price)
        preprocessor = ColumnTransformer(
            transformers=[('cat', OneHotEncoder(handle_unknown='ignore'), ['type', 'location'])]
        )

        # Decide model based on data size
        if len(df) >= 5:
            model = GradientBoostingRegressor(n_estimators=50, random_state=42)
        else:
            model = LinearRegression()
            
        pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])
        
        X = df[['type', 'location']]
        y = df['rent']
        pipeline.fit(X, y)
        
        # Predict purely based on Location and Type characteristics
        X_pred = pd.DataFrame([{'type': target_type, 'location': target_loc}])
        predicted_rent = pipeline.predict(X_pred)[0]
        
        # --- Location Multiplier Logic ---
        high_demand = ['kothrud', 'viman nagar', 'hinjewadi', 'baner', 'koregaon park', 'kalyani nagar', 'kharadi', 'wakad']
        medium_demand = ['katraj', 'swargate', 'pimpri', 'hadapsar', 'wagholi', 'shivajinagar', 'bibwewadi', 'dhankawadi']
        
        # 3) Area-Based Adjustment
        multiplier = 0.85 # Low-cost areas (-15%)
        if any(area in target_loc for area in high_demand):
            multiplier = 1.3 # High-demand (+30%)
        elif any(area in target_loc for area in medium_demand):
            multiplier = 1.0 # Medium areas (base price)
            
        predicted_rent = predicted_rent * multiplier
        
        # --- Flat-Type Base Floor Logic ---
        base_floors = {
            '1rk': 5000,
            '1bhk': 8000,
            '2bhk': 15000,
            '3bhk': 25000,
            'villa': 30000,
            'studio': 6000
        }
        floor_limit = base_floors.get(target_type, anchor_price * 0.6)
        
        if predicted_rent < floor_limit:
            predicted_rent = floor_limit
            
        # Validation Layer: Enforce Hard Caps on Output
        if predicted_rent > max_limit: 
            predicted_rent = max_limit
            
        min_allowed = floor_limit
        if predicted_rent < min_allowed: 
            predicted_rent = min_allowed

        return {"predicted_price": int(round(predicted_rent, -2))}
        
    except Exception as e:
        print(f"ML Model Error: {e}")
        return {"predicted_price": int(min(anchor_price, max_limit))}

@app.get("/")
def read_root():
    return {"message": "AI Recommendation Engine is running!"}


def _calculate_persona_score(row, persona_key, property_embedding, target_loc, target_type, target_rent):
    """
    Calculate a single persona score for a property using multi-factor weighted scoring.
    
    Weights:
      - NLP Semantic Similarity: 30%
      - Persona/SuitableFor Match: 25%
      - Property Type Fit: 20%
      - Budget/Rent Fit: 15%
      - Keyword/Lifestyle Bonus: 10%
    """
    
    # --- Parse compatibility metadata ---
    compat = {}
    compat_raw = row.get('compatibility_metadata')
    if compat_raw:
        if isinstance(compat_raw, dict):
            compat = compat_raw
        elif isinstance(compat_raw, str):
            try:
                compat = json.loads(compat_raw)
            except Exception:
                compat = {}
    
    suitable_for = str(compat.get('suitableFor', '')).lower()
    area_type = str(compat.get('areaType', '')).lower()
    noise_level = str(compat.get('noiseLevel', '')).lower()
    lifestyle_type = str(compat.get('lifestyleType', '')).lower()
    desc = str(row.get('description', '')).lower()
    title = str(row.get('title', '')).lower()
    prop_type = str(row.get('type', '')).lower()
    rent = float(row.get('rent', 0)) if row.get('rent') is not None else 0
    location = str(row.get('location', '')).lower()
    combined_text = f"{title} {desc} {suitable_for} {area_type} {noise_level} {lifestyle_type}"
    
    # =====================================================
    # FACTOR 1: NLP Semantic Similarity (30%)
    # =====================================================
    persona_emb = PERSONA_EMBEDDINGS.get(persona_key)
    if persona_emb is not None and property_embedding is not None:
        sim = float(util.cos_sim(persona_emb, property_embedding)[0][0])
        nlp_factor = max(0.0, min(1.0, sim))
    else:
        nlp_factor = 0.3  # fallback
    
    # =====================================================
    # FACTOR 2: Persona / SuitableFor Match (25%)
    # =====================================================
    persona_factor = 0.0
    
    if persona_key == 'student':
        if 'student' in suitable_for:
            persona_factor = 1.0
        elif 'anyone' in suitable_for:
            persona_factor = 0.6
        elif 'working' in suitable_for or 'professional' in suitable_for:
            persona_factor = 0.3
        elif 'families' in suitable_for or 'family' in suitable_for:
            persona_factor = 0.15
        else:
            persona_factor = 0.4  # unspecified
            
    elif persona_key == 'family':
        if 'families' in suitable_for or 'family' in suitable_for:
            persona_factor = 1.0
        elif 'anyone' in suitable_for:
            persona_factor = 0.5
        elif 'working' in suitable_for or 'professional' in suitable_for:
            persona_factor = 0.25
        elif 'student' in suitable_for:
            persona_factor = 0.1
        else:
            persona_factor = 0.35
            
    elif persona_key == 'professional':
        if 'working' in suitable_for or 'professional' in suitable_for:
            persona_factor = 1.0
        elif 'anyone' in suitable_for:
            persona_factor = 0.55
        elif 'student' in suitable_for:
            persona_factor = 0.3
        elif 'families' in suitable_for or 'family' in suitable_for:
            persona_factor = 0.35
        else:
            persona_factor = 0.4
    
    # =====================================================
    # FACTOR 3: Property Type Fit (20%)
    # =====================================================
    type_factor = 0.5  # default neutral
    
    if persona_key == 'student':
        if '1rk' in prop_type or '1 rk' in prop_type:
            type_factor = 1.0
        elif '1bhk' in prop_type or '1 bhk' in prop_type:
            type_factor = 0.9
        elif 'studio' in prop_type:
            type_factor = 0.85
        elif '2bhk' in prop_type or '2 bhk' in prop_type:
            type_factor = 0.4
        elif '3bhk' in prop_type or '3 bhk' in prop_type or 'villa' in prop_type:
            type_factor = 0.15
            
    elif persona_key == 'family':
        if '3bhk' in prop_type or '3 bhk' in prop_type:
            type_factor = 1.0
        elif '4bhk' in prop_type or '4 bhk' in prop_type or 'villa' in prop_type:
            type_factor = 1.0
        elif '2bhk' in prop_type or '2 bhk' in prop_type:
            type_factor = 0.85
        elif '1bhk' in prop_type or '1 bhk' in prop_type:
            type_factor = 0.25
        elif '1rk' in prop_type or '1 rk' in prop_type or 'studio' in prop_type:
            type_factor = 0.1
            
    elif persona_key == 'professional':
        if '1bhk' in prop_type or '1 bhk' in prop_type:
            type_factor = 1.0
        elif '2bhk' in prop_type or '2 bhk' in prop_type:
            type_factor = 0.9
        elif 'studio' in prop_type:
            type_factor = 0.8
        elif '1rk' in prop_type or '1 rk' in prop_type:
            type_factor = 0.6
        elif '3bhk' in prop_type or '3 bhk' in prop_type or 'villa' in prop_type:
            type_factor = 0.45
    
    # =====================================================
    # FACTOR 4: Budget / Rent Fit (15%)
    # =====================================================
    budget_factor = 0.5  # default neutral
    
    if persona_key == 'student':
        if rent <= 8000:
            budget_factor = 1.0
        elif rent <= 12000:
            budget_factor = 0.9
        elif rent <= 18000:
            budget_factor = 0.7
        elif rent <= 25000:
            budget_factor = 0.35
        else:
            budget_factor = 0.1
            
    elif persona_key == 'family':
        if 15000 <= rent <= 35000:
            budget_factor = 1.0
        elif 10000 <= rent <= 50000:
            budget_factor = 0.7
        elif rent < 10000:
            budget_factor = 0.3
        else:
            budget_factor = 0.4
            
    elif persona_key == 'professional':
        if 12000 <= rent <= 30000:
            budget_factor = 1.0
        elif 8000 <= rent <= 40000:
            budget_factor = 0.7
        elif rent < 8000:
            budget_factor = 0.4
        else:
            budget_factor = 0.35
    
    # If user specified a target rent, boost properties within budget
    if target_rent and target_rent < float('inf'):
        if rent <= target_rent:
            budget_factor = min(1.0, budget_factor + 0.2)
        elif rent <= target_rent * 1.2:
            pass  # slight over-budget, keep as-is
        else:
            budget_factor = max(0.1, budget_factor - 0.2)
    
    # =====================================================
    # FACTOR 5: Keyword / Lifestyle / Amenities Bonus (10%)
    # =====================================================
    keyword_factor = 0.3  # base
    
    if persona_key == 'student':
        student_keywords = ['student', 'college', 'hostel', 'affordable', 'budget', 'sharing', 'pg', 'bachelor', 'study']
        hits = sum(1 for kw in student_keywords if kw in combined_text)
        keyword_factor = min(1.0, 0.2 + hits * 0.15)
        if 'quiet' in noise_level or 'peaceful' in noise_level:
            keyword_factor = min(1.0, keyword_factor + 0.1)
            
    elif persona_key == 'family':
        family_keywords = ['family', 'spacious', 'school', 'park', 'garden', 'safe', 'peaceful', 'children', 'kid', 'playground']
        hits = sum(1 for kw in family_keywords if kw in combined_text)
        keyword_factor = min(1.0, 0.2 + hits * 0.15)
        if 'quiet' in noise_level or 'peaceful' in noise_level or 'low' in noise_level:
            keyword_factor = min(1.0, keyword_factor + 0.15)
        if 'residential' in area_type:
            keyword_factor = min(1.0, keyword_factor + 0.1)
            
    elif persona_key == 'professional':
        pro_keywords = ['office', 'metro', 'furnished', 'internet', 'wifi', 'premium', 'modern', 'professional', 'working', 'commute', 'it park']
        hits = sum(1 for kw in pro_keywords if kw in combined_text)
        keyword_factor = min(1.0, 0.2 + hits * 0.15)
        if 'commercial' in area_type or 'mixed' in area_type:
            keyword_factor = min(1.0, keyword_factor + 0.1)
    
    # =====================================================
    # WEIGHTED SUM
    # =====================================================
    raw_score = (
        nlp_factor * 30 +
        persona_factor * 25 +
        type_factor * 20 +
        budget_factor * 15 +
        keyword_factor * 10
    )
    
    # =====================================================
    # BONUS: Exact match boosts
    # =====================================================
    bonus = 0
    
    # Location exact match bonus (+10)
    if target_loc and target_loc.lower() in location:
        bonus += 10
    
    # Exact persona match bonus (+10)
    if persona_key == 'student' and 'student' in suitable_for:
        bonus += 10
    elif persona_key == 'family' and ('families' in suitable_for or 'family' in suitable_for):
        bonus += 10
    elif persona_key == 'professional' and ('working' in suitable_for or 'professional' in suitable_for):
        bonus += 10
    
    # Rating bonus (up to +5)
    avg_rating = float(row.get('average_rating', 0) or 0)
    if avg_rating >= 4.0:
        bonus += 5
    elif avg_rating >= 3.0:
        bonus += 3
    
    raw_score += bonus
    
    # =====================================================
    # CLAMPING: Ensure realistic score ranges
    # =====================================================
    # Determine if there's at least a partial match
    has_partial_match = (persona_factor >= 0.3 or type_factor >= 0.4 or nlp_factor >= 0.4)
    
    if has_partial_match and raw_score < 60:
        # Partial match minimum: 60
        raw_score = 60 + (raw_score / 60) * 5  # scale up slightly
    
    # Cap at 99
    final_score = int(round(min(99, max(0, raw_score))))
    
    # If absolutely no relevant match at all, keep in 30-45 range
    if persona_factor <= 0.15 and type_factor <= 0.15 and nlp_factor < 0.3:
        final_score = min(final_score, 45)
    
    return final_score


@app.post("/api/recommend")
def get_recommendations(req: RecommendationRequest):
    db = get_mongo_db()
    raw_props = list(db['properties'].find(
        {'status': {'$in': ['active', 'available']}}
    ))
    # Enrich with average_rating from reviews collection
    for p in raw_props:
        p['id'] = str(p['_id'])
        reviews = list(db['reviews'].find({'property_id': p['_id']}, {'rating': 1}))
        if reviews:
            p['average_rating'] = sum(r['rating'] for r in reviews) / len(reviews)
        else:
            p['average_rating'] = 0
    rows = raw_props
    df = pd.DataFrame(rows)
    
    if df.empty:
        return {"recommendations": [], "is_fallback": False}

    # Extract user persona and preferences
    target_loc = ""
    target_type = ""
    target_rent = float('inf')
    profession = ""
    
    for interaction in req.interactions:
        if interaction.action_type == 'search' and interaction.metadata:
            meta = interaction.metadata
            if isinstance(meta, str):
                try: meta = json.loads(meta)
                except Exception: pass
            
            if isinstance(meta, dict):
                if meta.get('location'): target_loc = str(meta.get('location'))
                if meta.get('type'): target_type = str(meta.get('type'))
                if meta.get('maxRent'):
                    try: target_rent = float(meta.get('maxRent'))
                    except ValueError: pass
                if meta.get('profession'): profession = str(meta.get('profession'))

    # Build Semantic User Query for general ranking
    user_query_parts = []
    if profession == "Student":
        user_query_parts.append("budget friendly affordable flat for students near colleges")
    elif profession == "Working Professional":
        user_query_parts.append("modern premium flat near business hubs with fast internet")
    elif profession == "Family":
        user_query_parts.append("spacious safe family home near schools and parks")
        
    if target_loc: user_query_parts.append(f"located in or near {target_loc}")
    if target_type: user_query_parts.append(f"property type {target_type}")
    if target_rent != float('inf'): user_query_parts.append(f"rent budget strictly under {target_rent}")
    
    user_query = " ".join(user_query_parts) if user_query_parts else "nice comfortable house for rent"
    
    # Encode user query
    user_embedding = nlp_model.encode(user_query, convert_to_tensor=True)

    # Build Property Descriptions for Semantic Matching
    def generate_property_text(row):
        compat_str = ""
        compat_raw = row.get('compatibility_metadata')
        if compat_raw:
            if isinstance(compat_raw, dict):
                compat_str = " ".join(str(v) for v in compat_raw.values() if v)
            elif isinstance(compat_raw, str):
                compat_str = compat_raw
        return f"{row.get('title', '')}. A {row.get('type', '')} located in {row.get('location', '')} with rent {row.get('rent', '')}. {row.get('description', '')}. Target audience: {compat_str}"

    df['semantic_text'] = df.apply(generate_property_text, axis=1)
    property_embeddings = nlp_model.encode(df['semantic_text'].tolist(), convert_to_tensor=True)
    cosine_scores = util.cos_sim(user_embedding, property_embeddings)[0]
    df['nlp_score'] = cosine_scores.cpu().tolist()
    
    # Store individual property embeddings for persona scoring
    prop_emb_list = [property_embeddings[i] for i in range(len(property_embeddings))]
    df['_prop_embedding'] = prop_emb_list
    
    # =====================================================
    # Calculate general relevance score + ALL 3 persona scores
    # =====================================================
    def calculate_all_scores(row):
        # General relevance score (used for ranking/selection)
        nlp_raw = float(row['nlp_score']) if pd.notnull(row.get('nlp_score')) else 0.0
        similarity_score = max(0.0, min(1.0, nlp_raw))
        
        general_score = similarity_score * 50
        
        # Location match
        if target_loc and target_loc.lower() in str(row.get('location', '')).lower():
            general_score += 20
        else:
            general_score += 10  # partial for having a location at all
        
        # Type match
        if target_type and target_type.lower() in str(row.get('type', '')).lower():
            general_score += 15
        else:
            general_score += 5
        
        # Persona match for general ranking
        compat = str(row.get('compatibility_metadata', '')).lower()
        desc = str(row.get('description', '')).lower()
        if profession:
            if profession.lower() in compat or profession.lower() in desc:
                general_score += 15
            else:
                general_score += 5
        else:
            general_score += 10
        
        # Rating bonus
        avg_rating = float(row.get('average_rating', 0) or 0)
        general_score += avg_rating * 2
        
        if pd.isna(general_score):
            general_score = 0.0
        
        # --- Per-persona scores ---
        prop_emb = row.get('_prop_embedding')
        
        s_score = _calculate_persona_score(row, 'student', prop_emb, target_loc, target_type, target_rent)
        f_score = _calculate_persona_score(row, 'family', prop_emb, target_loc, target_type, target_rent)
        p_score = _calculate_persona_score(row, 'professional', prop_emb, target_loc, target_type, target_rent)
        
        # Build reason
        reason_parts = []
        if target_loc and target_loc.lower() in str(row.get('location', '')).lower():
            reason_parts.append("matches your preferred location")
        if target_type and target_type.lower() in str(row.get('type', '')).lower():
            reason_parts.append(f"is a {row.get('type', '')}")
        if profession:
            compat_str = str(row.get('compatibility_metadata', '')).lower()
            if profession.lower() in compat_str:
                reason_parts.append(f"is suitable for {profession}s")
        
        attributes = []
        if target_loc and target_loc.lower() in str(row.get('location', '')).lower():
            attributes.append("Location Match")
        if target_type and target_type.lower() in str(row.get('type', '')).lower():
            attributes.append("Type Match")
        
        if not reason_parts:
            reason = "Recommended based on overall match profile."
        elif len(reason_parts) == 1:
            reason = f"This property {reason_parts[0]}."
        elif len(reason_parts) == 2:
            reason = f"This property {reason_parts[0]} and {reason_parts[1]}."
        else:
            reason = f"This property {reason_parts[0]}, {reason_parts[1]}, and {reason_parts[2]}."
        
        return pd.Series([
            int(round(general_score)),
            reason,
            attributes,
            similarity_score,
            s_score,
            f_score,
            p_score
        ])

    df[['final_score', 'reason', 'matched_attributes', 'similarity_score', 'student_score', 'family_score', 'professional_score']] = df.apply(calculate_all_scores, axis=1)
    
    sorted_df = df.sort_values(by='final_score', ascending=False)
    
    # Threshold Logic
    strong_matches = sorted_df[sorted_df['final_score'] >= 60].head(5)
    
    if len(strong_matches) > 0:
        final_results = strong_matches
        is_fallback = False
    else:
        # Fallback to Top 3 closest options
        final_results = sorted_df.head(3)
        is_fallback = True
    
    recommendations = []
    for _, row in final_results.iterrows():
        fin_score = float(row['final_score'])
        if pd.isna(fin_score): fin_score = 0.0
        
        sim_score = float(row['similarity_score'])
        if pd.isna(sim_score): sim_score = 0.0
        
        s_score = int(row['student_score']) if pd.notnull(row['student_score']) else 0
        f_score = int(row['family_score']) if pd.notnull(row['family_score']) else 0
        p_score = int(row['professional_score']) if pd.notnull(row['professional_score']) else 0
        
        recommendations.append({
            "id": str(row['id']),
            "match_score": int(round(fin_score)),
            "similarity_score": sim_score,
            "student_score": s_score,
            "family_score": f_score,
            "professional_score": p_score,
            "reason": str(row['reason']),
            "matched_attributes": row['matched_attributes']
        })
        
    print(f"--- [AI NLP Logic] user_id: {req.user_id} ---")
    print(f"Persona: '{profession}', Query: '{user_query}'")
    for rec in recommendations:
        print(f"  Property {rec['id']}: general={rec['match_score']}%, student={rec['student_score']}%, family={rec['family_score']}%, professional={rec['professional_score']}%")
    print(f"Recommendations count: {len(recommendations)}, Fallback: {is_fallback}")
    
    return {
        "recommendations": recommendations,
        "is_fallback": is_fallback
    }
