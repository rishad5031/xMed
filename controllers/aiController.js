const { GoogleGenAI } = require('@google/genai');

// Strict medical disclaimer system instruction as specified
const SYSTEM_INSTRUCTION = `You are MR.MED, the intelligent health assistant for xMED. Provide general wellness guidance and explain diagnostic terms simply. Do not diagnose conditions or prescribe medications. Advise consulting a licensed doctor for official clinical decisions.`;

// Conversational Clinical Fallback Knowledge Base (guarantees 100% uptime even if network hiccups)
const CLINICAL_KNOWLEDGE_BASE = [
  {
    keywords: ['hi', 'hello', 'hey', 'who are you', 'what can you do', 'good morning', 'good evening', 'help'],
    response: `### 👋 Greetings! I am MR.MED
I am your personal AI Health Assistant and clinical guide integrated into the **xMED National Healthcare Portal**.

#### How I can assist you:
* 🩸 **Decode Lab Reports**: Ask me about CBC, Blood Glucose, HbA1c, Lipid Profiles, or Kidney & Liver markers.
* 🩺 **Understand Vitals**: Guidance on blood pressure thresholds, resting pulse, and physiological metrics.
* 🥗 **Lifestyle & Nutrition**: Practical advice for diabetes-friendly diet, sodium moderation, and vitality.
* 📋 **Navigate xMED**: Instructions on viewing your prescriptions, uploading diagnostic PDFs, or finding certified doctors.
* 🚨 **Emergency Access**: Fast access to 24/7 Bangladesh healthcare helplines (**16263** & **999**).

*What health or diagnostic topic can I help you explore today?*`
  },
  {
    keywords: ['headache', 'migraine', 'head ache', 'head hurts', 'head pain'],
    response: `### 🤕 Understanding Headaches & Relief Guidelines

Headaches generally fall into three main categories:
* **Tension Headaches**: Most common; feels like a dull band across the forehead or back of the neck. Often triggered by stress, eye strain, dehydration, or prolonged screen exposure.
* **Migraines**: Throbbing, one-sided pain often accompanied by light sensitivity, sound sensitivity, or nausea.
* **Sinus Headaches**: Facial pressure centered around cheeks, bridge of nose, and forehead.

#### Self-Care & Relief Strategies:
1. **Hydration**: Drink 1–2 large glasses of clean water immediately.
2. **Rest**: Lie down in a cool, quiet, darkened room with a cool cloth over your forehead.
3. **Screen Break**: Rest your eyes from monitors and mobile screens for 20–30 minutes.

> **🚨 Red Flag Warning:** If your headache is sudden and extraordinarily severe (*"thunderclap"*), or accompanied by high fever, stiff neck, slurred speech, or numbness, please seek immediate emergency care or call **999** / **16263**.`
  },
  {
    keywords: ['fever', 'temperature', 'feverish', 'chills', 'high temp'],
    response: `### 🌡️ Managing Fevers & Temperature Guidance

A fever is your immune system's natural defense mechanism against viral or bacterial infections:
* **Normal Body Temperature**: **97.0°F – 99.0°F** (36.1°C – 37.2°C).
* **Low-Grade Fever**: **99.5°F – 100.9°F** (37.5°C – 38.3°C).
* **Significant Fever**: **≥ 101.0°F** (≥ 38.3°C).
* **High Fever**: **≥ 103.0°F** (≥ 39.4°C) — requires prompt clinical evaluation.

#### Supportive Care Steps:
1. **Hydration**: Drink plenty of fluids (water, ORS, clear broths) to prevent dehydration.
2. **Rest & Light Clothing**: Wear light, breathable cotton clothing.
3. **Tepid Sponging**: Use room-temperature water on forehead, neck, and underarms. Avoid ice-cold water.

> **⚠️ When to See a Doctor:** Consult your physician if fever lasts longer than 3 days, exceeds 103°F, or is accompanied by stiff neck, rash, or persistent vomiting.`
  },
  {
    keywords: ['cough', 'cold', 'flu', 'sore throat', 'runny nose', 'congestion', 'sneezing'],
    response: `### 🤧 Cough, Cold & Upper Respiratory Care

Most common seasonal respiratory symptoms resolve within 7 to 10 days with proper supportive care:

#### Symptomatic Relief Tips:
* **Warm Saline Gargle**: Mix 1/2 tsp salt in warm water and gargle 3 times daily to relieve pharyngeal irritation.
* **Steam Inhalation**: Inhale warm steam for 5–10 minutes to clear nasal congestion and loosen mucus.
* **Warm Fluids with Honey**: Warm tea or water with honey soothes ticklish coughs *(Note: never give honey to infants under 1 year)*.
* **Rest**: Ensure 7–8 hours of sound sleep to promote immune recovery.

> **Consult a Doctor If**: You develop shortness of breath, persistent chest pain, or coughing up blood.`
  },
  {
    keywords: ['gastric', 'acidity', 'heartburn', 'acid reflux', 'stomach ache', 'stomach pain', 'gerd', 'indigestion'],
    response: `### 🫄 Acidity, Acid Reflux & Gastric Discomfort

Acid reflux (GERD) and gastric irritation occur when stomach acid flows back into the esophagus or irritates the lining:

#### Practical Management Advice:
1. **Smaller, Frequent Meals**: Avoid large single meals; leave 2–3 hours between dinner and lying down.
2. **Limit Common Triggers**: Reduce deep-fried foods, excessive chili, raw onions, and carbonated sodas.
3. **Elevate Head of Bed**: Keep your head and upper chest slightly raised during sleep.

> **⚠️ Emergency Notice:** Crushing central chest pressure that radiates to the left arm, neck, or jaw is NOT simple acidity; seek immediate emergency evaluation.`
  },
  {
    keywords: ['cbc', 'complete blood count', 'hemoglobin', 'platelet', 'wbc', 'rbc', 'esr'],
    response: `### 🩸 Understanding Complete Blood Count (CBC) Results

A **Complete Blood Count (CBC)** measures the primary cellular components of your blood:

* **Hemoglobin (Hb)**: 
  * *Normal Range*: Men: **13.5–17.5 g/dL** | Women: **12.0–15.5 g/dL**.
  * Low levels may indicate anemia, fatigue, or iron deficiency.
* **White Blood Cells (WBC / Leukocytes)**: 
  * *Normal Range*: **4,000–11,000 cells/µL**.
  * Elevated counts usually signify an active immune response fighting infection.
* **Platelet Count**: 
  * *Normal Range*: **150,000–450,000 /µL**.
  * Essential for normal blood clotting; low counts may cause easy bruising.

> **⚠️ Medical Notice:** Laboratory reference intervals can vary slightly. Always share your report with your registered doctor on xMED for clinical interpretation.`
  },
  {
    keywords: ['blood pressure', 'bp', 'hypertension', 'systolic', 'diastolic', 'pressure'],
    response: `### 🩺 Blood Pressure Categories & Guidelines

Blood pressure is measured as **Systolic** (heart contracting) over **Diastolic** (heart resting):

* **Normal**: Systolic **< 120 mmHg** AND Diastolic **< 80 mmHg**
* **Elevated**: Systolic **120–129 mmHg** AND Diastolic **< 80 mmHg**
* **Stage 1 Hypertension**: Systolic **130–139 mmHg** OR Diastolic **80–89 mmHg**
* **Stage 2 Hypertension**: Systolic **≥ 140 mmHg** OR Diastolic **≥ 90 mmHg**
* **🚨 Hypertensive Crisis**: Systolic **> 180 mmHg** and/or Diastolic **> 120 mmHg** *(Seek immediate emergency care!)*

#### Lifestyle Recommendations:
1. **Reduce Dietary Sodium**: Aim for under 2,000 mg of sodium daily.
2. **Regular Cardio**: 30 minutes of brisk walking 5 days weekly.
3. **Log Vitals**: Record your readings in the **xMED Citizen Health Vault** to track longitudinal trends.`
  },
  {
    keywords: ['diabetes', 'glucose', 'sugar', 'hba1c', 'fasting', 'insulin'],
    response: `### 🍬 Blood Glucose & HbA1c Clinical Thresholds

Blood sugar tests monitor how your body metabolizes glucose:

* **Fasting Blood Glucose (8–10 hours fasting)**:
  * **Normal**: **70–99 mg/dL** (3.9–5.5 mmol/L)
  * **Pre-diabetes / Impaired**: **100–125 mg/dL** (5.6–6.9 mmol/L)
  * **Diabetes Diagnostic**: **≥ 126 mg/dL** (≥ 7.0 mmol/L) on two separate occasions.
* **HbA1c (3-Month Average Glucose)**:
  * **Normal**: **< 5.7%**
  * **Pre-diabetes**: **5.7% – 6.4%**
  * **Diabetes**: **≥ 6.5%**`
  },
  {
    keywords: ['emergency', 'helpline', 'ambulance', 'hospital', 'bangladesh', 'dghs', '999', '16263'],
    response: `### 🚨 Bangladesh National Emergency Healthcare Helplines

If you or a family member is in acute distress, these 24/7 services are available toll-free:

* **National Emergency Service**: 📞 **999** (Ambulance, Police, Fire)
* **DGHS National Health Call Center**: 📞 **16263** (24/7 Doctor Teleconsultation & Govt Hospital Guidance)
* **National Heart Foundation Hotline**: 📞 **10606**
* **Institute of Child Health (Shishu Hospital)**: 📞 **+880-2-58153322**
* **Dhaka Medical College Emergency**: 📞 **+880-2-55165088**`
  }
];

function findFallbackAnswer(userText) {
  const text = (userText || '').toLowerCase().trim();
  for (const item of CLINICAL_KNOWLEDGE_BASE) {
    if (item.keywords.some(k => text.includes(k))) {
      return item.response;
    }
  }

  return `### 💡 Clinical Guidance from MR.MED

Thank you for your question regarding health, wellness, and medical terminology!

* **General Wellness Recommendation**: Maintaining regular hydration (2–3 liters daily), a balanced diet rich in leafy greens and lean protein, and 30 minutes of moderate activity promotes cardiovascular and metabolic health.
* **Consulting Your Doctor**: For personalized diagnoses, prescriptions, or specific symptom evaluations, please consult a verified physician through the **xMED Doctor Portal**.
* **Emergency Assistance**: If you are experiencing acute chest pain, high fever, or breathing difficulty, call **16263** or **999** immediately.`;
}

/**
 * 100% Server-Side Proxied POST /api/ai/chat
 * Reads GEMINI_API_KEY from environment.
 * Zero client key input required.
 */
async function handleChat(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        reply: 'Please provide a valid question or message.',
        message: 'Message content is required.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Execute server-side Gemini call with server key
    if (apiKey && apiKey.trim() !== '' && apiKey.trim() !== 'your_gemini_api_key_here') {
      const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash'];
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const promptText = `User inquiry: "${message.trim()}"`;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.4
            }
          });

          const replyText = response && response.text ? response.text.trim() : null;
          if (replyText) {
            return res.json({
              success: true,
              reply: replyText,
              source: modelName
            });
          }
        } catch (modelError) {
          console.warn(`[MR.MED Server Proxy Notice with ${modelName}]:`, modelError.message);
        }
      }
    }

    // High-reliability clinical fallback if external API is unreachable
    const fallbackAnswer = findFallbackAnswer(message);
    return res.json({
      success: true,
      reply: fallbackAnswer,
      source: 'xmed-clinical-engine'
    });

  } catch (error) {
    console.error('[MR.MED Server Proxy Error]:', error);
    return res.status(500).json({
      success: false,
      reply: 'An error occurred while processing your question. Please try again or consult your doctor.',
      error: error.message
    });
  }
}

// Server-side status check
async function getStatus(req, res) {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  return res.json({
    success: true,
    active: true,
    model: 'gemini-3.6-flash',
    provider: hasKey ? 'Google Gemini 3.6 (Server-Side Proxy)' : 'xMED Clinical Engine'
  });
}

module.exports = {
  handleChat,
  getStatus
};
