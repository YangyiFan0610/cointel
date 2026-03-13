// Triggering a code change for GitHub sync
import React, { useState } from 'react';
import { 
  Rocket, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Github, 
  Globe,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-10 bg-indigo-600 text-white text-center relative overflow-hidden">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">一键发布你的网站</h1>
            <p className="text-indigo-100 font-medium">只需 3 步，让全世界看到你的作品</p>
          </motion.div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>

        {/* Content */}
        <div className="p-10">
          <div className="space-y-8">
            {/* Step 1 */}
            <div className={`flex gap-6 transition-opacity ${step === 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-xl shadow-sm">1</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  导出代码到 GitHub
                  {step > 1 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  点击屏幕<b>最右上角</b>的 <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700"><Settings size={14} /> Settings</span> 按钮，在 <b>GitHub</b> 栏目下填好仓库名，点击底部的 <b>"Export"</b>。
                </p>
                {step === 1 && (
                  <button 
                    onClick={() => setStep(2)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    我已导出，下一步 <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex gap-6 transition-opacity ${step === 2 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-xl shadow-sm">2</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  连接 Vercel 部署
                  {step > 2 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  打开 <a href="https://vercel.com/new" target="_blank" className="text-indigo-600 font-bold underline">Vercel 导入页面</a>，选择你刚才导出的 GitHub 仓库，点击 <b>"Deploy"</b>。
                </p>
                {step === 2 && (
                  <button 
                    onClick={() => setStep(3)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    正在部署，最后一步 <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex gap-6 transition-opacity ${step === 3 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-xl shadow-sm">3</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">大功告成！</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  等待大约 60 秒，你的网站就永远在线了。你会得到一个 <code className="bg-slate-100 px-1 rounded">.vercel.app</code> 的免费链接。
                </p>
                {step === 3 && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4" /> 恭喜！你已经掌握了零成本上线网站的所有技能。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium mb-4">需要帮助？点击左侧聊天框随时问我。</p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Github size={12} /> GitHub
            </div>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Globe size={12} /> Vercel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
