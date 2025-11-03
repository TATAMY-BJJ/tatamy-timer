-- Fix security definer view warning by setting security_invoker on soucty view
ALTER VIEW public.soucty SET (security_invoker = true);