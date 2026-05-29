export const calculateLifestyleMatch = (property, lifestyle) => {
    if (!lifestyle || !lifestyle.persona) return null;

    let score = 50; // Base score
    let reasons = [];

    const rent = Number(property.rent);
    const type = property.type.toUpperCase();
    const desc = property.description.toLowerCase();

    // Persona Logic
    if (lifestyle.persona === 'Student') {
        if (rent < 15000) { score += 15; reasons.push("Great budget for a student."); }
        else if (rent > 25000) { score -= 15; reasons.push("Rent might be too expensive for a typical student budget."); }
        
        if (['1RK', '1BHK', 'STUDIO'].includes(type)) { score += 20; reasons.push("Perfect size for student living."); }
        else if (['3BHK', 'VILLA'].includes(type)) { score -= 15; reasons.push("Might be too large to maintain for a student alone."); }
    } 
    else if (lifestyle.persona === 'Professional') {
        if (rent >= 10000 && rent <= 30000) { score += 10; reasons.push("Hits the sweet spot for a working professional's budget."); }
        if (['1BHK', '2BHK'].includes(type)) { score += 15; reasons.push("Ideal space for a professional."); }
    }
    else if (lifestyle.persona === 'Family') {
        if (['2BHK', '3BHK', 'VILLA'].includes(type)) { score += 25; reasons.push("Spacious enough for comfortable family living."); }
        else if (['1RK', 'STUDIO'].includes(type)) { score -= 25; reasons.push("Likely too tight for a family."); }
    }

    // Budget Logic
    if (lifestyle.budget === 'Budget') {
        if (rent < 12000) { score += 20; reasons.push("Extremely budget-friendly!"); }
        else if (rent > 25000) { score -= 20; reasons.push("Outside your preferred low-budget range."); }
    } else if (lifestyle.budget === 'Luxury') {
        if (rent > 35000) { score += 15; reasons.push("Fits your luxury lifestyle preference."); }
        else if (rent < 15000) { score -= 10; reasons.push("May lack the premium amenities you're looking for."); }
    }

    // Vibe Logic
    if (lifestyle.vibe === 'Quiet') {
        if (desc.includes('quiet') || desc.includes('peaceful') || desc.includes('suburban') || desc.includes('family')) {
            score += 15; reasons.push("Matches your desire for a quiet and peaceful area.");
        }
        if (desc.includes('downtown') || desc.includes('nightlife') || desc.includes('hub')) {
            score -= 10; reasons.push("Might be too noisy for your preference.");
        }
    } else if (lifestyle.vibe === 'Nightlife') {
        if (desc.includes('city') || desc.includes('downtown') || desc.includes('nightlife') || desc.includes('hub')) {
            score += 15; reasons.push("Right in the middle of the action!");
        }
        if (desc.includes('quiet') || desc.includes('suburban')) {
            score -= 10; reasons.push("Might be too quiet for your preference.");
        }
    }

    // Clamp score
    score = Math.max(10, Math.min(99, score));

    return {
        score,
        reasons
    };
};
