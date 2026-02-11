
// Import React to provide the React namespace for types like ReactNode
import React from 'react';

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}


