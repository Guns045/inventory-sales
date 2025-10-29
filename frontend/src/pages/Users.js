import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

const Users = () => {
  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Manajemen User
              </h4>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <Alert.Heading>Coming Soon</Alert.Heading>
                <p>Halaman Manajemen User sedang dalam pengembangan.</p>
                <hr />
                <p className="mb-0">
                  Fitur ini akan memungkinkan admin untuk:
                </p>
                <ul>
                  <li>Menambah user baru</li>
                  <li>Mengedit user yang ada</li>
                  <li>Menghapus user</li>
                  <li>Manajemen role dan permission</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Users;