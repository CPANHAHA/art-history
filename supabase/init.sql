-- Supabase 初始化：枚举、表结构与初始管理员
-- 在 Supabase SQL Editor 中执行本脚本

-- 扩展：用于生成 UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 用户状态枚举
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending','member','admin','blacklisted');
  END IF;
END $$;

-- users 表
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  status user_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 初始管理员注入（如已存在则跳过）
-- 密码：19870110
-- 哈希算法：PBKDF2-HMAC-SHA256，迭代 100000，dklen=32
-- salt(hex)：71e2bf1aa68a4f3db2f9e5d4c3b2a190
-- hash(hex)：9b2898a7a1e57a2df89fd000db357adb8c59b65891663bc40657c93dcc81d669
INSERT INTO public.users (username, password_hash, password_salt, status)
SELECT 'chuye1987',
       '9b2898a7a1e57a2df89fd000db357adb8c59b65891663bc40657c93dcc81d669',
       '71e2bf1aa68a4f3db2f9e5d4c3b2a190',
       'admin'::user_status
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE username = 'chuye1987');

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

