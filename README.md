# 电车充电记录

多车辆、多用户、多终端数据同步的电车充电记录管理应用。

## 快速开始

```bash
cd ev-charging-tracker
npm install
npm run dev
```

## 内置帐号

| 角色 | 帐号 | 密码 |
|------|------|------|
| 管理员 | 362036811@qq.com | htl1914 |
| 普通用户 | yyl | xr35-105 |
| 普通用户 | htl | xr35-105 |

## 云同步配置 (Supabase)

1. 在 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中执行 `supabase-schema.sql`
3. 在 `.env.local` 中填入：
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx
   ```

## 部署到 Vercel

```bash
npx vercel --prod
```
