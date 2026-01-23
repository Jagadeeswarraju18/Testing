import { supabase } from "../lib/supabase";
import { Subscription, Insight } from "../types";

/**
 * Generate AI-powered insights by calling the secure Edge Function
 * The Gemini API key stays server-side, never exposed in the app bundle
 */
export const generateGeminiInsights = async (
  subscriptions: Subscription[],
  currency: string
): Promise<Insight[]> => {
  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke("generate-insights", {
      body: {
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          billingCycle: s.billingCycle,
          category: s.category,
          lastUsedDate: s.lastUsedDate,
        })),
        currency,
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      return getFallbackInsights();
    }

    if (data?.insights && Array.isArray(data.insights)) {
      return data.insights;
    }

    return getFallbackInsights();
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return getFallbackInsights();
  }
};

/**
 * Local fallback insights when edge function is unavailable
 */
function getFallbackInsights(): Insight[] {
  return [
    {
      id: "fallback-tip",
      type: "rule_based",
      message: "Review your subscriptions regularly to identify services you no longer use.",
      severity: "low",
    },
  ];
}
