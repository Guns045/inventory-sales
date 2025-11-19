-- Add dashboard.approval permission
INSERT INTO permissions (name, guard_name, created_at, updated_at)
VALUES ('dashboard.approval', 'web', datetime('now'), datetime('now'))
ON CONFLICT(name) DO NOTHING;

-- Get permission ID
-- Assign permission to Admin role
INSERT INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.name = 'dashboard.approval'
AND NOT EXISTS (
    SELECT 1 FROM role_has_permissions rh
    WHERE rh.role_id = r.id AND rh.permission_id = p.id
);