/**
 * Calculate match score for a single persona (backward compat).
 */
export const calculateProfessionMatch = (property, profession) => {
    const scores = calculateAllPersonaScores(property);
    if (profession === 'Student') return scores.student_score;
    if (profession === 'Family') return scores.family_score;
    if (profession === 'Working Professional') return scores.professional_score;
    return 0;
};

/**
 * Calculate all three persona scores for a property using multi-factor weighted scoring.
 * Returns { student_score, family_score, professional_score }
 * 
 * Weights:
 *   - SuitableFor Match: 30%
 *   - Property Type Fit: 25%  
 *   - Budget/Rent Fit: 20%
 *   - Keyword/Lifestyle Bonus: 15%
 *   - Rating Bonus: 10%
 */
export const calculateAllPersonaScores = (property) => {
    // Parse compatibility data safely
    let compData = null;
    if (property.compatibility_metadata) {
        try {
            compData = typeof property.compatibility_metadata === 'string' 
                ? JSON.parse(property.compatibility_metadata) 
                : property.compatibility_metadata;
        } catch(e){}
    }
    
    const rent = Number(property.rent) || 0;
    const type = property.type ? property.type.toLowerCase() : '';
    const suitableFor = (compData?.suitableFor || '').toLowerCase();
    const noiseLevel = (compData?.noiseLevel || '').toLowerCase();
    const areaType = (compData?.areaType || '').toLowerCase();
    const lifestyleType = (compData?.lifestyleType || '').toLowerCase();
    const desc = (property.description || '').toLowerCase();
    const title = (property.title || '').toLowerCase();
    const combined = `${title} ${desc} ${suitableFor} ${areaType} ${noiseLevel} ${lifestyleType}`;
    const avgRating = parseFloat(property.average_rating) || 0;
    
    // Deterministic variation based on property ID to prevent identical scores
    const idStr = String(property.id || property._id || '');
    let idHash = 0;
    for (let i = 0; i < idStr.length; i++) {
        idHash = ((idHash << 5) - idHash + idStr.charCodeAt(i)) | 0;
    }
    const variation = Math.abs(idHash % 7) - 3; // -3 to +3
    
    const calcScore = (persona) => {
        let personaFactor = 0, typeFactor = 0.5, budgetFactor = 0.5, keywordFactor = 0.3;
        
        // --- Persona / SuitableFor Match (30%) ---
        if (persona === 'student') {
            if (suitableFor.includes('student')) personaFactor = 1.0;
            else if (suitableFor.includes('anyone')) personaFactor = 0.6;
            else if (suitableFor.includes('working') || suitableFor.includes('professional')) personaFactor = 0.3;
            else if (suitableFor.includes('families') || suitableFor.includes('family')) personaFactor = 0.15;
            else personaFactor = 0.4;
        } else if (persona === 'family') {
            if (suitableFor.includes('families') || suitableFor.includes('family')) personaFactor = 1.0;
            else if (suitableFor.includes('anyone')) personaFactor = 0.5;
            else if (suitableFor.includes('working') || suitableFor.includes('professional')) personaFactor = 0.25;
            else if (suitableFor.includes('student')) personaFactor = 0.1;
            else personaFactor = 0.35;
        } else if (persona === 'professional') {
            if (suitableFor.includes('working') || suitableFor.includes('professional')) personaFactor = 1.0;
            else if (suitableFor.includes('anyone')) personaFactor = 0.55;
            else if (suitableFor.includes('student')) personaFactor = 0.3;
            else if (suitableFor.includes('families') || suitableFor.includes('family')) personaFactor = 0.35;
            else personaFactor = 0.4;
        }
        
        // --- Type Fit (25%) ---
        if (persona === 'student') {
            if (type.includes('1rk') || type.includes('1 rk')) typeFactor = 1.0;
            else if (type.includes('1bhk') || type.includes('1 bhk')) typeFactor = 0.9;
            else if (type.includes('studio')) typeFactor = 0.85;
            else if (type.includes('2bhk') || type.includes('2 bhk')) typeFactor = 0.4;
            else typeFactor = 0.15;
        } else if (persona === 'family') {
            if (type.includes('3bhk') || type.includes('3 bhk') || type.includes('4bhk') || type.includes('villa')) typeFactor = 1.0;
            else if (type.includes('2bhk') || type.includes('2 bhk')) typeFactor = 0.85;
            else if (type.includes('1bhk') || type.includes('1 bhk')) typeFactor = 0.25;
            else typeFactor = 0.1;
        } else if (persona === 'professional') {
            if (type.includes('1bhk') || type.includes('1 bhk')) typeFactor = 1.0;
            else if (type.includes('2bhk') || type.includes('2 bhk')) typeFactor = 0.9;
            else if (type.includes('studio')) typeFactor = 0.8;
            else if (type.includes('1rk') || type.includes('1 rk')) typeFactor = 0.6;
            else typeFactor = 0.45;
        }
        
        // --- Budget Fit (20%) ---
        if (persona === 'student') {
            if (rent <= 8000) budgetFactor = 1.0;
            else if (rent <= 12000) budgetFactor = 0.9;
            else if (rent <= 18000) budgetFactor = 0.7;
            else if (rent <= 25000) budgetFactor = 0.35;
            else budgetFactor = 0.1;
        } else if (persona === 'family') {
            if (rent >= 15000 && rent <= 35000) budgetFactor = 1.0;
            else if (rent >= 10000 && rent <= 50000) budgetFactor = 0.7;
            else if (rent < 10000) budgetFactor = 0.3;
            else budgetFactor = 0.4;
        } else if (persona === 'professional') {
            if (rent >= 12000 && rent <= 30000) budgetFactor = 1.0;
            else if (rent >= 8000 && rent <= 40000) budgetFactor = 0.7;
            else if (rent < 8000) budgetFactor = 0.4;
            else budgetFactor = 0.35;
        }
        
        // --- Keyword Bonus (15%) ---
        if (persona === 'student') {
            const kws = ['student', 'college', 'hostel', 'affordable', 'budget', 'sharing', 'pg', 'bachelor', 'study'];
            const hits = kws.filter(k => combined.includes(k)).length;
            keywordFactor = Math.min(1.0, 0.2 + hits * 0.15);
            if (noiseLevel.includes('quiet') || noiseLevel.includes('peaceful')) keywordFactor = Math.min(1.0, keywordFactor + 0.1);
        } else if (persona === 'family') {
            const kws = ['family', 'spacious', 'school', 'park', 'garden', 'safe', 'peaceful', 'children', 'kid', 'playground'];
            const hits = kws.filter(k => combined.includes(k)).length;
            keywordFactor = Math.min(1.0, 0.2 + hits * 0.15);
            if (noiseLevel.includes('quiet') || noiseLevel.includes('peaceful') || noiseLevel.includes('low')) keywordFactor = Math.min(1.0, keywordFactor + 0.15);
            if (areaType.includes('residential')) keywordFactor = Math.min(1.0, keywordFactor + 0.1);
        } else if (persona === 'professional') {
            const kws = ['office', 'metro', 'furnished', 'internet', 'wifi', 'premium', 'modern', 'professional', 'working', 'commute'];
            const hits = kws.filter(k => combined.includes(k)).length;
            keywordFactor = Math.min(1.0, 0.2 + hits * 0.15);
            if (areaType.includes('commercial') || areaType.includes('mixed')) keywordFactor = Math.min(1.0, keywordFactor + 0.1);
        }
        
        // --- Rating Bonus (10%) ---
        let ratingFactor = 0.3;
        if (avgRating >= 4.0) ratingFactor = 1.0;
        else if (avgRating >= 3.0) ratingFactor = 0.7;
        else if (avgRating > 0) ratingFactor = 0.5;
        
        // Weighted sum
        let raw = (
            personaFactor * 30 +
            typeFactor * 25 +
            budgetFactor * 20 +
            keywordFactor * 15 +
            ratingFactor * 10
        );
        
        // Bonus for exact persona match
        if (persona === 'student' && suitableFor.includes('student')) raw += 10;
        else if (persona === 'family' && (suitableFor.includes('families') || suitableFor.includes('family'))) raw += 10;
        else if (persona === 'professional' && (suitableFor.includes('working') || suitableFor.includes('professional'))) raw += 10;
        
        raw += variation;
        
        // Clamping
        const hasPartialMatch = personaFactor >= 0.3 || typeFactor >= 0.4;
        if (hasPartialMatch && raw < 60) {
            raw = 60 + (raw / 60) * 5;
        }
        
        if (personaFactor <= 0.15 && typeFactor <= 0.15) {
            raw = Math.min(raw, 45);
        }
        
        return Math.min(99, Math.max(0, Math.round(raw)));
    };
    
    return {
        student_score: calcScore('student'),
        family_score: calcScore('family'),
        professional_score: calcScore('professional')
    };
};
