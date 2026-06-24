export default class ExtractionValidationService {
  static validate(rawJson) {
    let parsed;
    try {
      // Sometimes Gemini wraps JSON in markdown ```json ... ```
      let cleanJson = rawJson.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
      }
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      throw new Error("Invalid JSON format from AI");
    }

    const result = {
      full_name: (parsed.full_name || '').trim(),
      company: (parsed.company || '').trim(),
      designation: (parsed.designation || '').trim(),
      email: (parsed.email || '').trim().toLowerCase(),
      phone: this.normalizePhone(parsed.phone),
      alternate_phone: this.normalizePhone(parsed.alternate_phone),
      website: this.normalizeWebsite(parsed.website),
      address: (parsed.address || '').trim(),
      city: (parsed.city || '').trim(),
      state: (parsed.state || '').trim(),
      country: (parsed.country || '').trim(),
      notes: (parsed.notes || '').trim(),
      confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.0,
      needs_manual_review: parsed.needs_manual_review === true,
      uncertain_fields: Array.isArray(parsed.uncertain_fields) ? parsed.uncertain_fields : []
    };

    // Auto-flag for manual review if critical fields are completely empty or confidence is low
    if (result.confidence_score < 0.80) {
      result.needs_manual_review = true;
    }

    const hasName = result.full_name.length > 0;
    const hasContact = result.email.length > 0 || result.phone.length > 0;
    
    if (!hasName || !hasContact) {
      result.needs_manual_review = true;
    }

    return result;
  }

  static normalizePhone(phone) {
    if (!phone) return '';
    return phone.trim().replace(/[^\d+()\s-]/g, '');
  }

  static normalizeWebsite(website) {
    if (!website) return '';
    let w = website.trim().toLowerCase();
    if (w.startsWith('http://')) w = w.replace('http://', '');
    if (w.startsWith('https://')) w = w.replace('https://', '');
    return w;
  }
}
