export const SITE_NAME = "Viberyt";
export const SITE_DESCRIPTION =
  "AI-powered voice-to-text transcription that understands context, accents, and technical terms.";

export const PRICING = {
  TRIAL: {
    name: "Free Trial",
    price: 0,
    duration: "7 days",
    features: [
      "Full access to all features",
      "Accurate transcription",
      "1 device activation",
    ],
    cta: "Start Free Trial",
    ctaLink: "/auth/signup",
  },
  LIFETIME: {
    name: "Lifetime License",
    price: 49,
    currency: "$",
    features: [
      "Permanent access",
      "All features included",
      "1 device activation",
      "Priority support",
    ],
    cta: "Buy Now",
    ctaLink: "/auth/signup?plan=lifetime",
  },
};

export const FEATURES = [
  {
    title: "Accurate Transcription",
    description:
      "Understands context, accents, and technical jargon with industry-leading accuracy",
    icon: "accuracy",
  },
  {
    title: "Real-Time Processing",
    description: "Get transcriptions instantly with minimal latency during your workflow",
    icon: "speed",
  },
  {
    title: "Privacy First",
    description: "All processing happens locally on your device—your data never leaves",
    icon: "privacy",
  },
  {
    title: "Universal Integration",
    description: "Works with any application using a simple global hotkey",
    icon: "integration",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Download the App",
    description: "Get the lightweight Viberyt application for Windows",
  },
  {
    step: "2",
    title: "Create Account",
    description: "Sign up and activate your 7-day free trial instantly",
  },
  {
    step: "3",
    title: "Start Transcribing",
    description: "Press the hotkey and watch your voice become text",
  },
];

export const FAQS = [
  {
    question: "How is my data handled?",
    answer:
      "All voice processing happens locally on your device. Your audio is never uploaded to our servers. We only store your account information and license key activation status.",
  },
  {
    question: "What happens when my trial ends?",
    answer:
      "When your 7-day trial expires, you can upgrade to a Lifetime License for $49 to continue using Viberyt. Without a valid license, the application will not transcribe.",
  },
  {
    question: "Can I use my license on multiple devices?",
    answer:
      "Each license is currently restricted to one device. If you need multi-device support, contact support. We're working on a team plan.",
  },
  {
    question: "How do I get my license key?",
    answer:
      "After signing up or purchasing, your license key is automatically sent to your email. Check your inbox and spam folder if needed.",
  },
  {
    question: "What if I find a bug?",
    answer:
      "Please report bugs to support@viberyt.com with details about what happened. We take stability seriously and prioritize fixes for critical issues.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 7-day free trial so you can test Viberyt before purchasing. Refund requests within 14 days of purchase are reviewed on a case-by-case basis.",
  },
  {
    question: "Is there a discount for teams?",
    answer:
      "Individual Lifetime Licenses are $49 each. Contact us at business@viberyt.com for volume discounts and team pricing.",
  },
  {
    question: "What OS does it support?",
    answer:
      "Viberyt currently supports Windows 10 and later. macOS and Linux support is planned for future releases.",
  },
];
