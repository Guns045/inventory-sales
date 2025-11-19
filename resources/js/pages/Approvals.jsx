import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

const Approvals = () => {
  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="bi bi-check-square me-2"></i>
                Approvals
              </h4>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <Alert.Heading>Coming Soon</Alert.Heading>
                <p>Halaman Approvals sedang dalam pengembangan.</p>
                <hr />
                <p className="mb-0">
                  Fitur ini akan memungkinkan admin untuk:
                </p>
                <ul>
                  <li>Melihat semua quotation yang menunggu approval</li>
                  <li>Approve/Reject quotation</li>
                  <li>History approval</li>
                  <li>Filtering dan searching</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Approvals;