import { friendsIntro } from '@config/friends-config';
import { useState } from 'react';
import { useClipboard } from 'foxact/use-clipboard';
import SakuraSVG from '../svg/SakuraSvg';
import { generateFriendYaml, type FormData } from './friend-request/yaml';
import { INPUT_CLASS, LABEL_CLASS } from './friend-request/styles';

function Field({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  name: keyof FormData;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className="group relative">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={INPUT_CLASS}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function FriendRequestForm() {
  const [formData, setFormData] = useState<FormData>({
    site: '',
    owner: '',
    url: '',
    desc: '',
    image: '',
    color: '#ffc0cb',
  });

  const { copied, copy } = useClipboard({ timeout: 2000 });
  const yaml = generateFriendYaml(formData);

  const handleCopy = () => {
    void copy(yaml);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="mb-4 w-full">
      <div className="relative overflow-hidden rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm md:p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-pink-100/50 dark:bg-pink-900/20" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-100/50 dark:bg-blue-900/20" />

        <div className="grid grid-cols-2 gap-12 md:grid-cols-1 md:gap-8">
          <div className="relative">
            <div className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 text-2xl font-black text-gray-800 dark:text-white">
                <SakuraSVG className="size-6 animate-spin text-[#FFC0CB] duration-10000" />
                申请友链
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {friendsIntro.applyDesc}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="friend-site"
                  name="site"
                  label="站点名称"
                  value={formData.site}
                  onChange={handleChange}
                  placeholder="我的博客"
                />
                <Field
                  id="friend-owner"
                  name="owner"
                  label="昵称"
                  value={formData.owner}
                  onChange={handleChange}
                  placeholder="您的昵称"
                />
              </div>

              <Field
                id="friend-url"
                name="url"
                label="站点链接"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://your-site.com"
                type="url"
              />

              <div className="group relative">
                <label htmlFor="friend-desc" className={LABEL_CLASS}>
                  站点描述
                </label>
                <textarea
                  id="friend-desc"
                  name="desc"
                  value={formData.desc}
                  onChange={handleChange}
                  rows={2}
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="一句话描述..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="friend-image"
                  name="image"
                  label="头像链接"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://..."
                  type="url"
                />
                <div className="group relative">
                  <label htmlFor="friend-color-picker" className={LABEL_CLASS}>
                    主题色
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border-2 border-gray-100 shadow-sm transition-transform hover:scale-105 dark:border-gray-700">
                      <input
                        type="color"
                        id="friend-color-picker"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] cursor-pointer p-0"
                      />
                    </div>
                    <input
                      type="text"
                      id="friend-color-text"
                      value={formData.color}
                      aria-label="主题色值"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className={`${INPUT_CLASS} flex-1`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center rounded-xl bg-gray-50 p-6 md:p-3 dark:bg-gray-800/50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-wider uppercase">
                配置预览
              </h3>
              <button
                onClick={handleCopy}
                className="group relative px-3 py-2 text-base font-bold transition-transform hover:-translate-y-1 dark:text-white">
                <div className="border-foreground absolute inset-0 rotate-[1deg] rounded-lg border-2 border-dashed transition-all group-hover:rotate-0 dark:border-white" />
                {copied ? '已复制!' : '复制配置'}
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border-2 border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/50">
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                {yaml}
              </pre>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-pink-50 p-4 text-xs font-medium text-pink-600 dark:bg-pink-900/20 dark:text-pink-300">
              提示: 复制上方代码并在下方评论区粘贴发送即可，我会收到的～
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
