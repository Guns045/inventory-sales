import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Table, Badge, Modal, Alert, Spinner, Pagination } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useForm, Controller } from 'react-hook-form';

const Users = () => {
  const { api } = useAPI();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userModalMode, setUserModalMode] = useState('create');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form setup for user create/edit
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm();

  // Load users with filters and pagination
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        role: roleFilter !== 'all' ? roleFilter : ''
      });

      const response = await api.get(`/users?${params}`);
      setUsers(response.data.data || response.data);
      setTotalPages(response.data.last_page || 1);
    } catch (err) {
      setError('Gagal memuat data user: ' + (err.response?.data?.message || err.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, searchTerm, statusFilter, roleFilter]);

  // Load roles
  const loadRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  // Load permissions for modal
  const loadPermissions = async () => {
    try {
      const response = await api.get('/permissions/grouped');
      setPermissions(response.data);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadPermissions();
  }, [loadUsers]);

  // Handle user selection for bulk actions
  const handleUserSelect = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  // Open modal for create/edit user
  const openUserModal = (user = null, mode = 'create') => {
    setUserModalMode(mode);
    setSelectedUser(user);
    setShowUserModal(true);

    if (user && mode === 'edit') {
      reset({
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        password: '', // Don't populate password for edit
        password_confirmation: '',
        warehouse_id: user.warehouse_id || '',
        can_access_multiple_warehouses: user.can_access_multiple_warehouses || false
      });
    } else {
      reset({
        name: '',
        email: '',
        role_id: '',
        password: '',
        password_confirmation: '',
        warehouse_id: '',
        can_access_multiple_warehouses: false
      });
    }
  };

  // Handle user create/update
  const handleUserSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      const payload = { ...data };

      // Remove password fields if empty (for edit mode)
      if (!payload.password) {
        delete payload.password;
        delete payload.password_confirmation;
      }

      if (userModalMode === 'create') {
        await api.post('/users', payload);
        setSuccess('User berhasil dibuat!');
      } else {
        await api.put(`/users/${selectedUser.id}`, payload);
        setSuccess('User berhasil diperbarui!');
      }

      setShowUserModal(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle user delete
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await api.delete(`/users/${selectedUser.id}`);
      setSuccess('User berhasil dihapus!');
      setShowDeleteModal(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle user status change
  const handleStatusChange = async (status) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await api.put(`/users/${selectedUser.id}/status`, {
        status: status,
        is_active: status === 'activate' ? 1 : 0
      });
      setSuccess(`User berhasil di${status === 'activate' ? 'aktifkan' : 'nonaktifkan'}!`);
      setShowStatusModal(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      setError('Pilih minimal satu user untuk aksi bulk.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      switch (action) {
        case 'activate':
          await api.post('/users/bulk-activate', { user_ids: selectedUsers });
          setSuccess(`${selectedUsers.length} user berhasil diaktifkan!`);
          break;
        case 'deactivate':
          await api.post('/users/bulk-deactivate', { user_ids: selectedUsers });
          setSuccess(`${selectedUsers.length} user berhasil dinonaktifkan!`);
          break;
        case 'delete':
          await api.post('/users/bulk-delete', { user_ids: selectedUsers });
          setSuccess(`${selectedUsers.length} user berhasil dihapus!`);
          break;
        case 'assign_role':
          const roleId = prompt('Masukkan ID Role untuk ditugaskan:');
          if (roleId) {
            await api.post('/users/bulk-assign-role', {
              user_ids: selectedUsers,
              role_id: roleId
            });
            setSuccess(`Role berhasil ditugaskan ke ${selectedUsers.length} user!`);
          }
          break;
      }

      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear alerts
  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  // Status badge component
  const StatusBadge = ({ user }) => {
    const isActive = user.is_active !== 0 && user.is_active !== false;
    return (
      <Badge bg={isActive ? 'success' : 'danger'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Manajemen User
                </h4>
                {selectedUsers.length > 0 && (
                  <small className="text-muted">
                    {selectedUsers.length} user dipilih
                  </small>
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => openUserModal(null, 'create')}
                className="d-flex align-items-center gap-2"
              >
                <i className="bi bi-plus-circle"></i>
                Tambah User
              </Button>
            </Card.Header>

            <Card.Body>
              {/* Alerts */}
              {error && (
                <Alert variant="danger" dismissible onClose={clearAlerts}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" dismissible onClose={clearAlerts}>
                  {success}
                </Alert>
              )}

              {/* Search and Filters */}
              <Row className="mb-4">
                <Col md={4}>
                  <InputGroup>
                    <Form.Control
                      placeholder="Cari nama atau email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loadUsers()}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={loadUsers}
                      disabled={loading}
                    >
                      <i className="bi bi-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua Status</option>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">Semua Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4} className="text-end">
                  {selectedUsers.length > 0 && (
                    <div className="d-flex gap-2 justify-content-end">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleBulkAction('activate')}
                        disabled={loading}
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleBulkAction('deactivate')}
                        disabled={loading}
                      >
                        <i className="bi bi-x-circle me-1"></i>
                        Deactivate
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleBulkAction('delete')}
                        disabled={loading}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>

              {/* Users Table */}
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2">Memuat data...</p>
                </div>
              ) : (
                <>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th width="40">
                          <Form.Check
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Gudang</th>
                        <th width="150">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            <i className="bi bi-inbox fs-1 text-muted"></i>
                            <p className="text-muted mb-0">Tidak ada data user</p>
                          </td>
                        </tr>
                      ) : (
                        users.map(user => (
                          <tr key={user.id}>
                            <td>
                              <Form.Check
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleUserSelect(user.id)}
                              />
                            </td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                              <Badge bg="info">{user.role?.name || '-'}</Badge>
                            </td>
                            <td>
                              <StatusBadge user={user} />
                            </td>
                            <td>{user.warehouse?.name || '-'}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => openUserModal(user, 'edit')}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.is_active ? "outline-warning" : "outline-success"}
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowStatusModal(true);
                                  }}
                                  title={user.is_active ? "Deactivate" : "Activate"}
                                >
                                  <i className={`bi bi-${user.is_active ? 'pause' : 'play'}`}></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDeleteModal(true);
                                  }}
                                  title="Delete"
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                      <Pagination>
                        <Pagination.First
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        />
                        <Pagination.Prev
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        />

                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                          const pageNumber = index + 1;
                          return (
                            <Pagination.Item
                              key={pageNumber}
                              active={currentPage === pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                            >
                              {pageNumber}
                            </Pagination.Item>
                          );
                        })}

                        <Pagination.Next
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        />
                        <Pagination.Last
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Modal (Create/Edit) */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {userModalMode === 'create' ? 'Tambah User Baru' : 'Edit User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(handleUserSubmit)}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nama *</Form.Label>
                  <Form.Control
                    type="text"
                    {...register('name', { required: 'Nama wajib diisi' })}
                    isInvalid={!!errors.name}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    {...register('email', {
                      required: 'Email wajib diisi',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Format email tidak valid'
                      }
                    })}
                    isInvalid={!!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    {...register('role_id', { required: 'Role wajib dipilih' })}
                    isInvalid={!!errors.role_id}
                  >
                    <option value="">Pilih Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.role_id?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Warehouse</Form.Label>
                  <Form.Select
                    {...register('warehouse_id')}
                  >
                    <option value="">Pilih Warehouse</option>
                    {/* Add warehouse options here */}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password {userModalMode === 'edit' ? '(Kosongkan jika tidak diubah)' : '*'}</Form.Label>
                  <Form.Control
                    type="password"
                    {...register('password', {
                      required: userModalMode === 'create' ? 'Password wajib diisi' : false,
                      minLength: {
                        value: 8,
                        message: 'Password minimal 8 karakter'
                      }
                    })}
                    isInvalid={!!errors.password}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Konfirmasi Password</Form.Label>
                  <Form.Control
                    type="password"
                    {...register('password_confirmation', {
                      validate: value => value === watch('password') || 'Password tidak cocok'
                    })}
                    isInvalid={!!errors.password_confirmation}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password_confirmation?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Bisa akses multiple warehouse"
                {...register('can_access_multiple_warehouses')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" />
                  <span className="ms-2">Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {userModalMode === 'create' ? 'Buat User' : 'Simpan Perubahan'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Hapus</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Apakah Anda yakin ingin menghapus user "{selectedUser?.name}"?</p>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Tindakan ini tidak dapat dibatalkan!
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleDeleteUser} disabled={loading}>
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-2">Menghapus...</span>
              </>
            ) : (
              <>
                <i className="bi bi-trash me-2"></i>
                Hapus
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Change Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Ubah Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Apakah Anda yakin ingin
            {selectedUser?.is_active ? ' menonaktifkan' : ' mengaktifkan'}
            user "{selectedUser?.name}"?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Batal
          </Button>
          <Button
            variant={selectedUser?.is_active ? 'warning' : 'success'}
            onClick={() => handleStatusChange(selectedUser?.is_active ? 'deactivate' : 'activate')}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-2">Memproses...</span>
              </>
            ) : (
              <>
                <i className={`bi bi-${selectedUser?.is_active ? 'pause' : 'play'} me-2`}></i>
                {selectedUser?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Users;