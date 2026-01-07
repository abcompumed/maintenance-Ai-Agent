/**
 * Universal Device Classification using AI patterns
 */
export function classifyDeviceInfo(text: string): {
  deviceType?: string;
  manufacturer?: string;
  model?: string;
} {
  const result: any = {
    deviceType: "Medical Equipment",
    manufacturer: "Generic/Other",
    model: "Unknown"
  };

  // 1. استخراج الشركة المصنعة بالاعتماد على الكلمات الدليلية الشائعة في الكتالوجات
  const mfgMatch = text.match(/(?:Manufacturer|Mfg|Produced by|Brand|Company)[\s:]*([A-Z][A-Za-z0-9\s&]{2,20})/i);
  if (mfgMatch) {
    result.manufacturer = mfgMatch[1].trim();
  } else {
    // محاولة ثانية: أول كلمة كبيرة في بداية الكتالوج غالباً ما تكون الشركة
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) result.manufacturer = lines[0].trim().substring(0, 30);
  }

  // 2. استخراج الموديل بالاعتماد على الأنماط الرقمية (مثل: R860, iE33, Alpha 7)
  const modelMatch = text.match(/(?:Model|Ref|Type|P\/N|Model No)[\s:]*([A-Z0-9\-\.\/]{3,20})/i);
  if (modelMatch) {
    result.model = modelMatch[1].trim();
  }

  // 3. تحديد نوع الجهاز من الكلمات المفتاحية التقنية (English Tech Terms)
  const keywords = {
    "Imaging": /Ultrasound|X-Ray|CT|MRI|Scanner|Endoscope/i,
    "Life Support": /Ventilator|Anesthesia|Defibrillator|Dialysis/i,
    "Monitoring": /Patient Monitor|ECG|EKG|Pulse Oximeter/i,
    "Laboratory": /Analyzer|Centrifuge|Microscope|Incubator/i,
    "Surgical": /Electrosurgical|Laser|C-Arm|Robotic/i
  };

  for (const [category, pattern] of Object.entries(keywords)) {
    if (pattern.test(text)) {
      result.deviceType = category;
      break;
    }
  }

  return result;
}
