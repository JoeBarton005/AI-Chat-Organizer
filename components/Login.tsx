import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { LogIn, UserPlus, AlertCircle, ArrowRight, Command, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请填写所有字段");
      return;
    }

    setIsLoading(true);
    try {
      let user: User;
      if (isRegistering) {
        user = await registerUser(username, password);
      } else {
        user = await loginUser(username, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "发生未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md p-8 bg-[#181a1d] border border-gray-800 rounded-2xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl mb-4 shadow-lg">
             <Command className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {isRegistering ? "创建账户" : "欢迎回来"}
          </h1>
          <p className="text-sm text-gray-500">
            Context Book - AI 智能文档总结工具
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[#0f1115] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
              placeholder="请输入用户名"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[#0f1115] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-900/10 p-3 rounded-lg border border-red-900/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center space-x-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
               <Loader2 className="animate-spin" size={20} />
            ) : (
               <>
                 <span>{isRegistering ? "立即注册" : "登录账户"}</span>
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
               </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
              setUsername("");
              setPassword("");
            }}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center space-x-1 mx-auto"
          >
            {isRegistering ? (
              <>
                <span>已有账户?</span>
                <span className="text-primary">去登录</span>
              </>
            ) : (
              <>
                <span>还没有账户?</span>
                <span className="text-primary">免费注册</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;