export interface FormData {
  site: string;
  owner: string;
  url: string;
  desc: string;
  image: string;
  color: string;
}

export function generateFriendYaml(formData: FormData): string {
  const fields = {
    site: formData.site || '站点名称',
    url: formData.url || 'https://example.com',
    owner: formData.owner || '您的昵称',
    desc: formData.desc || '站点描述',
    image: formData.image || 'https://example.com/avatar.jpg',
    color: formData.color || '#ffc0cb',
  };

  // JSON double-quoted strings are valid YAML scalars, including their escapes.
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
}
