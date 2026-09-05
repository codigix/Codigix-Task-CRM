import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

const BookDemoSection = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companySize: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: 'N/A', // Not collected in this form
        subject: 'CRM Demo Request',
        message: `Company Size: ${formData.companySize}\n\nMessage: ${formData.message}`
      };

      const response = await fetch('https://codigixinfotech.com/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          companySize: '',
          message: ''
        });
        setIsSubmitting(false);
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        console.error('Failed to submit inquiry');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };
  return (
    <section className="py-20 lg:py-32 bg-slate-900 relative overflow-hidden" id="demo">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600/5 blur-[150px] -z-10 pointer-events-none"></div>
      <div className="absolute -left-32 bottom-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">

          {/* Left Content */}
          <div className="w-full lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold mb-6">
              <CalendarDays size={16} /> Free 30-minute consultation
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              See Codigix CRM in action.
            </h2>
            <p className="text-lg text-slate-400 mb-8 font-light leading-relaxed max-w-lg">
              Get a personalized walkthrough of our platform. We'll show you how Codigix can be tailored to solve your specific business challenges.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'Identify bottlenecks in your current workflow',
                'Discover how to automate your sales pipeline',
                'See real-time analytics and reporting capabilities',
                'Get answers to your technical and security questions'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <img src="https://i.pravatar.cc/100?img=12" alt="Sales" className="w-12 h-12 rounded-full border-2 border-slate-900 object-cover" />
                <img src="https://i.pravatar.cc/100?img=33" alt="Sales" className="w-12 h-12 rounded-full border-2 border-slate-900 object-cover" />
              </div>
              <div className="text-sm text-slate-400">
                Speak directly with our <span className="font-semibold text-white">product experts.</span>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div className="w-full lg:w-1/2 max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
              <h3 className="text-2xl  text-slate-900 mb-6">Book your demo</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">First Name</label>
                    <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all" placeholder="Jane" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Last Name</label>
                    <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all" placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Work Email</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all" placeholder="jane@company.com" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Company Size</label>
                  <select required value={formData.companySize} onChange={(e) => setFormData({ ...formData, companySize: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-slate-700">
                    <option value="">Select size...</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                <div className="space-y-1.5 pb-2">
                  <label className="text-xs font-semibold text-slate-600">How can we help?</label>
                  <textarea required rows="3" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none" placeholder="Tell us about your current challenges..."></textarea>
                </div>

                <button type="submit" disabled={isSubmitting || isSuccess} className={`w-full rounded-xl py-3.5  text-sm transition-all shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isSuccess ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400 shadow-[0_4px_15px_rgb(220,38,38,0.2)]'}`}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> :
                    isSuccess ? <><CheckCircle2 size={18} /> Request Sent!</> :
                      <>Schedule Demo <ArrowRight size={16} /></>}
                </button>

                {isSuccess && (
                  <div className="text-emerald-600 text-xs font-semibold text-center mt-2 animate-fade-in-up">
                    Thank you! We have received your request and will be in touch shortly.
                  </div>
                )}

                <p className="text-[10px] text-slate-400 text-center pt-2">
                  By submitting this form, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default BookDemoSection;
