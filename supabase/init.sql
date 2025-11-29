-- Supabase 初始化：枚举与表结构

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



-- 索引
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
