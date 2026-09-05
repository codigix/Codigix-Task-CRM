import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small teams just getting started.',
      price: isAnnual ? 29 : 39,
      popular: false,
      features: [
        'Up to 5 users',
        'Basic Sales Pipeline',
        'Contact Management',
        'Standard Support',
        'Basic Analytics'
      ],
      notIncluded: [
        'Advanced Integrations',
        'Custom Roles & Permissions',
        'Dedicated Account Manager'
      ]
    },
    {
      name: 'Professional',
      description: 'Everything you need for a growing business.',
      price: isAnnual ? 79 : 99,
      popular: true,
      features: [
        'Up to 25 users',
        'Advanced Sales Pipeline',
        'Marketing Automation',
        'Priority 24/7 Support',
        'Advanced Custom Analytics',
        'API Access & Webhooks',
        'Custom Roles & Permissions'
      ],
      notIncluded: [
        'Dedicated Account Manager'
      ]
    },
    {
      name: 'Enterprise',
      description: 'Advanced features for scaling organizations.',
      price: isAnnual ? 199 : 249,
      popular: false,
      features: [
        'Unlimited users',
        'Everything in Professional',
        'Dedicated Account Manager',
        'Custom Onboarding & Training',
        'SSO & Advanced Security',
        'Service Level Agreement (SLA)',
        'Custom Integrations'
      ],
      notIncluded: []
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white relative overflow-hidden" id="pricing">
      {/* Background flourishes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-50 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Simple, transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-500">pricing</span>
          </h2>
          <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed">
            Choose the perfect plan for your team. Start small and upgrade as you grow. No hidden fees, ever.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-semibold transition-colors ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              className="relative inline-flex h-8 w-16 items-center rounded-full bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={() => setIsAnnual(!isAnnual)}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold transition-colors ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Annually</span>
              <span className="bg-red-100 text-red-700 text-[10px]  px-2 py-0.5 rounded-full">SAVE 20%</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-white rounded-3xl border transition-all duration-300 ${plan.popular ? 'border-red-500 shadow-2xl shadow-red-900/10 scale-105 z-20' : 'border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 z-10'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs  px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl  text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 mb-6 h-10">{plan.description}</p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                    <span className="text-sm font-medium text-slate-500">/mo</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {isAnnual ? 'Billed annually' : 'Billed monthly'}
                  </div>
                </div>

                <button className={`w-full py-3.5 rounded-xl  transition-all ${plan.popular ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>
                  Get Started
                </button>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
                <div className="text-xs  text-slate-900 uppercase tracking-widest mb-4">What's included</div>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, idx) => (
                    <li key={`not-${idx}`} className="flex items-start gap-3 opacity-60">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <X size={12} className="text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-500 line-through">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
