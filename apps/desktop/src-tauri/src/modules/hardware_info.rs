use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu_count: usize,
    pub cpu_frequency: u64,    // MHz
    pub total_memory: u64,     // MB
    pub available_memory: u64, // MB
    pub cpu_vendor: String,
    pub cpu_brand: String,
    pub has_avx: bool,
    pub has_avx2: bool,
    pub capability_score: u32,
    #[serde(serialize_with = "serialize_tier_as_string")]
    pub recommended_tier: ModelTier,
}

fn serialize_tier_as_string<S>(tier: &ModelTier, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(tier.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModelTier {
    Cloud,
    Minimal,
    Balanced,
    Quality,
    Maximum,
}

impl ModelTier {
    pub fn to_string(&self) -> &'static str {
        match self {
            ModelTier::Cloud => "cloud",
            ModelTier::Minimal => "minimal",
            ModelTier::Balanced => "balanced",
            ModelTier::Quality => "quality",
            ModelTier::Maximum => "maximum",
        }
    }
    pub fn from_string(s: &str) -> Option<Self> {
        match s {
            "cloud" => Some(ModelTier::Cloud),
            "minimal" => Some(ModelTier::Minimal),
            "balanced" => Some(ModelTier::Balanced),
            "quality" => Some(ModelTier::Quality),
            "maximum" => Some(ModelTier::Maximum),
            _ => None,
        }
    }

    pub fn get_model_ids(&self) -> Vec<&'static str> {
        match self {
            ModelTier::Cloud => vec!["cloud"],
            // Minimal: Smallest models for basic hardware (75-142 MiB)
            ModelTier::Minimal => vec!["base.en", "tiny.en"],
            // Balanced: Small quantized models for mid-range hardware (181-252 MiB)
            ModelTier::Balanced => vec!["small.en-q8_0", "small.en-q5_1"],
            // Quality: Medium quantized models for good hardware (514-785 MiB)
            ModelTier::Quality => vec!["medium.en-q8_0", "medium.en-q5_0"],
            // Maximum: Best models up to large-v3-turbo limit (547 MiB - 1.5 GiB)
            ModelTier::Maximum => vec!["large-v3-turbo", "large-v3-turbo-q8_0"],
        }
    }

    pub fn get_primary_model_id(&self) -> &'static str {
        self.get_model_ids()[0]
    }

    #[allow(dead_code)]
    pub fn get_display_info(&self) -> TierDisplayInfo {
        match self {
            ModelTier::Cloud => TierDisplayInfo {
                name: "Cloud Provider",
                description:
                    "Highest accuracy with our cloud infrastructure. Requires internet connection.",
                icon: "☁️",
                min_ram_gb: 0,
                typical_model_size_mb: 0,
            },
            ModelTier::Minimal => TierDisplayInfo {
                name: "Minimal",
                description: "Fast and lightweight for quick notes and basic transcription.",
                icon: "⚡",
                min_ram_gb: 2,
                typical_model_size_mb: 142,
            },
            ModelTier::Balanced => TierDisplayInfo {
                name: "Balanced",
                description: "Good accuracy for everyday use, meetings, and general dictation.",
                icon: "⚖️",
                min_ram_gb: 4,
                typical_model_size_mb: 181,
            },
            ModelTier::Quality => TierDisplayInfo {
                name: "Quality",
                description:
                    "Enhanced accuracy for professional needs, interviews, and complex audio.",
                icon: "✨",
                min_ram_gb: 8,
                typical_model_size_mb: 514,
            },
            ModelTier::Maximum => TierDisplayInfo {
                name: "Maximum",
                description: "Best possible accuracy with advanced language understanding.",
                icon: "🚀",
                min_ram_gb: 16,
                typical_model_size_mb: 547,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierDisplayInfo {
    pub name: &'static str,
    pub description: &'static str,
    pub icon: &'static str,
    pub min_ram_gb: u32,
    pub typical_model_size_mb: u32,
}

pub fn detect_hardware() -> HardwareInfo {
    // Create a new System instance and refresh everything
    let sys = System::new_all();

    // Get CPU information
    let cpus = sys.cpus();
    let cpu_count = cpus.len();
    let cpu_frequency = if !cpus.is_empty() {
        cpus[0].frequency()
    } else {
        0
    };

    // Get CPU vendor and brand
    let (cpu_vendor, cpu_brand) = if !cpus.is_empty() {
        (cpus[0].vendor_id().to_string(), cpus[0].brand().to_string())
    } else {
        ("Unknown".to_string(), "Unknown".to_string())
    };

    // Detect CPU features
    let has_avx = detect_cpu_feature("avx");
    let has_avx2 = detect_cpu_feature("avx2");

    // Get memory information (convert to MB)
    let total_memory = sys.total_memory() / (1024 * 1024);
    let available_memory = sys.available_memory() / (1024 * 1024);

    // Calculate capability score
    let capability_score = calculate_capability_score(
        cpu_count,
        cpu_frequency,
        total_memory,
        available_memory,
        has_avx,
        has_avx2,
    );

    // Determine recommended tier
    let recommended_tier = determine_recommended_tier(capability_score, available_memory);

    HardwareInfo {
        cpu_count,
        cpu_frequency,
        total_memory,
        available_memory,
        cpu_vendor,
        cpu_brand,
        has_avx,
        has_avx2,
        capability_score,
        recommended_tier,
    }
}

fn detect_cpu_feature(feature: &str) -> bool {
    #[cfg(target_arch = "x86_64")]
    {
        match feature {
            "avx" => is_x86_feature_detected!("avx"),
            "avx2" => is_x86_feature_detected!("avx2"),
            _ => false,
        }
    }
    #[cfg(not(target_arch = "x86_64"))]
    {
        false
    }
}

fn calculate_capability_score(
    cpu_count: usize,
    cpu_frequency: u64,
    total_memory: u64,
    available_memory: u64,
    has_avx: bool,
    has_avx2: bool,
) -> u32 {
    let mut score = 0u32;

    // CPU cores score (0-30 points)
    score += match cpu_count {
        0..=1 => 5,
        2..=3 => 10,
        4..=5 => 15,
        6..=7 => 20,
        8..=11 => 25,
        _ => 30,
    };

    // CPU frequency score (0-20 points)
    score += match cpu_frequency {
        0..=1999 => 5,
        2000..=2499 => 10,
        2500..=2999 => 15,
        _ => 20,
    };

    // Total memory score (0-30 points)
    let total_memory_gb = total_memory / 1024;
    score += match total_memory_gb {
        0..=3 => 5,
        4..=7 => 10,
        8..=15 => 20,
        16..=31 => 25,
        _ => 30,
    };

    // Available memory score (0-10 points)
    let available_memory_gb = available_memory / 1024;
    score += match available_memory_gb {
        0..=1 => 0,
        2..=3 => 3,
        4..=7 => 5,
        8..=15 => 8,
        _ => 10,
    };

    // CPU features score (0-10 points)
    if has_avx {
        score += 3;
    }
    if has_avx2 {
        score += 7;
    }

    score
}

fn determine_recommended_tier(capability_score: u32, available_memory: u64) -> ModelTier {
    let available_memory_gb = available_memory / 1024;

    // Only use cloud for truly ancient systems - models only use ~300MB RAM in practice
    if capability_score < 15 || available_memory_gb < 1 {
        return ModelTier::Cloud;
    }

    // Much more aggressive tier assignment - most modern systems should get Maximum
    // Since actual model RAM usage is only ~200-300MB, focus on CPU performance
    match (capability_score, available_memory_gb) {
        (15..=34, _) => ModelTier::Minimal,  // Very basic systems
        (35..=54, _) => ModelTier::Balanced, // Older but decent systems
        (55..=74, _) => ModelTier::Quality,  // Good systems
        (75.., _) => ModelTier::Maximum,     // Most modern systems - aggressive!
        _ => ModelTier::Minimal,
    }
}

#[tauri::command]
pub fn get_hardware_info() -> HardwareInfo {
    detect_hardware()
}

#[tauri::command]
pub fn get_recommended_tier() -> String {
    let info = detect_hardware();
    info.recommended_tier.to_string().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capability_scoring() {
        // Test low-end system
        let score = calculate_capability_score(2, 1800, 4096, 2048, false, false);
        assert!(score < 40);

        // Test mid-range system
        let score = calculate_capability_score(4, 2600, 8192, 4096, true, false);
        assert!(score >= 40 && score < 70);

        // Test high-end system
        let score = calculate_capability_score(8, 3500, 16384, 8192, true, true);
        assert!(score >= 70);
    }

    #[test]
    fn test_tier_recommendation() {
        // Test truly weak system - should use cloud
        let tier = determine_recommended_tier(10, 1024);
        assert_eq!(tier, ModelTier::Cloud);

        // Test minimal system
        let tier = determine_recommended_tier(30, 4096);
        assert_eq!(tier, ModelTier::Minimal);

        // Test balanced system
        let tier = determine_recommended_tier(50, 8192);
        assert_eq!(tier, ModelTier::Balanced);

        // Test quality system
        let tier = determine_recommended_tier(65, 8192);
        assert_eq!(tier, ModelTier::Quality);

        // Test maximum system - much more achievable now!
        let tier = determine_recommended_tier(80, 8192);
        assert_eq!(tier, ModelTier::Maximum);

        // Test boundary cases
        let tier = determine_recommended_tier(15, 2048); // Just above cloud threshold
        assert_eq!(tier, ModelTier::Minimal);

        let tier = determine_recommended_tier(75, 2048); // Maximum tier with modest RAM
        assert_eq!(tier, ModelTier::Maximum);
    }

    #[test]
    fn test_model_tier_conversions() {
        assert_eq!(ModelTier::from_string("cloud"), Some(ModelTier::Cloud));
        assert_eq!(ModelTier::from_string("minimal"), Some(ModelTier::Minimal));
        assert_eq!(ModelTier::from_string("invalid"), None);

        assert_eq!(ModelTier::Cloud.to_string(), "cloud");
        assert_eq!(ModelTier::Maximum.to_string(), "maximum");
    }
}
