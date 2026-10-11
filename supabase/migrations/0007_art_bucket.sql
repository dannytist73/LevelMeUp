-- Quest art (M6a, decision 10): one public bucket for the fixed art set. The app only reads public URLs; only the owner
-- uploads (in the dashboard), so no storage policy is added. Nothing else in storage changes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lmu-art', 'lmu-art', true, 1048576, array['image/webp', 'application/json'])
on conflict (id) do nothing;
