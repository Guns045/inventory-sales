import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

const Reports = () => {
  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Laporan
              </h4>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <Alert.Heading>Coming Soon</Alert.Heading>
                <p>Halaman Laporan sedang dalam pengembangan.</p>
                <hr />
                <p className="mb-0">
                  Fitur ini akan memungkinkan admin untuk:
                </p>
                <ul>
                  <li>Laporan Penjualan</li>
                  <li>Laporan Stok</li>
                  <li>Laporan Keuangan</li>
                  <li>Laporan Customer/Supplier</li>
                  <li>Export ke PDF/Excel</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;