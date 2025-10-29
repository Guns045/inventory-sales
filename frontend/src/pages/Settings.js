import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

const Settings = () => {
  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Settings
              </h4>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <Alert.Heading>Coming Soon</Alert.Heading>
                <p>Halaman Settings sedang dalam pengembangan.</p>
                <hr />
                <p className="mb-0">
                  Fitur ini akan memungkinkan admin untuk:
                </p>
                <ul>
                  <li>Pengaturan sistem</li>
                  <li>Konfigurasi perusahaan</li>
                  <li>Backup & Restore</li>
                  <li>Template dokumen</li>
                  <li>Integrasi API</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;