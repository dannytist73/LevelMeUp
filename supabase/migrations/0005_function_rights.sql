-- New functions are executable by everyone unless revoked: 0001's per-schema `alter default privileges … revoke`
-- can't remove the global default (Postgres adds per-schema defaults to the global ones). So every migration that
-- creates functions ends with this revoke (a lint checks it), and the explicit grants stay: the entry points for
-- lmu_service (0003) and player_id() for lmu_player (0004). Found by the live DB tests after 0004.
revoke all on all functions in schema levelmeup from public, anon, authenticated;
