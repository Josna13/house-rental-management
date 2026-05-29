export const calculateCompatibilityScore = (property, userPrefs) => {
    if (!userPrefs) return null;

    let score = 0;
    let details = {
        matches: [],
        mismatches: []
    };

    // Parse owner data if available
    let ownerData = null;
    try {
        if (property.compatibility_metadata) {
            ownerData = typeof property.compatibility_metadata === 'string' ? JSON.parse(property.compatibility_metadata) : property.compatibility_metadata;
        }
    } catch(e){}

    const desc = property.description ? property.description.toLowerCase() : '';

    // Weights:
    // Area: 25%
    // Lifestyle: 25%
    // Cleanliness: 20%
    // Rules (Smoking): 15%
    // Review/Desc NLP: 15%

    // 1. AREA (25%)
    let areaScore = 0;
    if (ownerData && ownerData.areaType) {
        if (userPrefs.area === 'Quiet' && (ownerData.areaType === 'Quiet Residential' || ownerData.areaType === 'Quiet')) areaScore = 25;
        else if (userPrefs.area === 'Busy' && (ownerData.areaType === 'Busy / Commercial' || ownerData.areaType === 'Busy')) areaScore = 25;
        else if (userPrefs.area === 'Moderate' && ownerData.areaType === 'Moderate') areaScore = 25;
        else if (userPrefs.area === 'Quiet' && ownerData.areaType === 'Moderate') areaScore = 15;
        else areaScore = 5;
    } else {
        areaScore = 15; // default
    }
    score += areaScore;
    if (areaScore > 15) details.matches.push(`Matches your preference for a ${userPrefs.area.toLowerCase()} area.`);
    else if (areaScore < 15) details.mismatches.push(`Area vibe might conflict with your preference for ${userPrefs.area.toLowerCase()} surroundings.`);

    // 2. LIFESTYLE & WORK (25%)
    let lifeScore = 0;
    if (ownerData) {
        let isMatch = false;
        if (userPrefs.workType === 'Student' && (ownerData.suitableFor === 'Students' || ownerData.suitableFor === 'Anyone')) isMatch = true;
        if (userPrefs.workType === 'Working Professional' && (ownerData.suitableFor === 'Working Professionals' || ownerData.suitableFor === 'Anyone')) isMatch = true;
        
        if (isMatch) lifeScore += 15;
        else lifeScore += 5;

        let vibeMatch = false;
        if (userPrefs.lifestyle === 'Peaceful' && (ownerData.lifestyleType === 'Peaceful / Family Friendly' || ownerData.lifestyleType === 'Peaceful')) vibeMatch = true;
        if (userPrefs.lifestyle === 'Party' && (ownerData.lifestyleType === 'Party Friendly' || ownerData.lifestyleType === 'Party')) vibeMatch = true;

        if (vibeMatch) lifeScore += 10;
        else lifeScore += 0;
    } else {
        lifeScore = 15;
    }
    score += lifeScore;
    if (lifeScore >= 20) details.matches.push(`Clearly suited for ${userPrefs.workType}s living a ${userPrefs.lifestyle.toLowerCase()} lifestyle.`);
    else if (lifeScore < 15) details.mismatches.push(`Slight mismatch in lifestyle preference or suitability.`);

    // 3. CLEANLINESS (20%)
    let cleanScore = 0;
    if (ownerData) {
        if (userPrefs.cleanliness === ownerData.cleanliness) cleanScore = 20;
        else if (userPrefs.cleanliness === 'High' && ownerData.cleanliness === 'Medium') cleanScore = 10;
        else cleanScore = 5;
    } else {
        cleanScore = 12;
    }
    score += cleanScore;
    if (cleanScore === 20) details.matches.push(`Property aligns exactly with your ${userPrefs.cleanliness} cleanliness standard.`);

    // 4. RULES/SMOKING (15%)
    let ruleScore = 0;
    if (ownerData) {
        if (userPrefs.smoking === 'No Smoking' && ownerData.rules === 'No Smoking') ruleScore = 15;
        else if (userPrefs.smoking === 'Smoking Allowed' && (ownerData.rules === 'No Restrictions' || ownerData.rules === 'Pets Allowed')) ruleScore = 15;
        else ruleScore = 5;
    } else {
        ruleScore = 10;
    }
    score += ruleScore;
    if (ruleScore === 15) details.matches.push(`House rules smoothly accommodate your personal smoking preferences.`);
    else if (ruleScore === 5) details.mismatches.push(`Warning: Owner's house rules may restrict your habits.`);

    // 5. REVIEW/NLP ANALYSIS (15%)
    let nlpScore = 0;
    let wordsFound = [];
    if (userPrefs.area === 'Quiet' && (desc.includes('quiet') || desc.includes('peaceful'))) { nlpScore += 8; wordsFound.push('quiet'); }
    if (userPrefs.area === 'Quiet' && desc.includes('noisy')) { nlpScore -= 5; }
    if (userPrefs.cleanliness === 'High' && (desc.includes('clean') || desc.includes('hygienic'))) { nlpScore += 7; wordsFound.push('clean'); }
    if (userPrefs.lifestyle === 'Party' && (desc.includes('hub') || desc.includes('nightlife'))) { nlpScore += 7; wordsFound.push('nightlife'); }

    if (wordsFound.length === 0) nlpScore = 8; // default neutral 
    score += Math.max(0, Math.min(15, nlpScore));
    if (wordsFound.length > 0) details.matches.push(`Description explicitly confirms your keywords implicitly: ${wordsFound.join(', ')}.`);

    score = Math.round(score);

    return {
        score,
        details
    };
};
