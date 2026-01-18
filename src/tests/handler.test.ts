import { APIGatewayProxyEvent } from 'aws-lambda';
import { solve } from '../handler';

describe('Tower of Hanoi Handler', () => {
  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/solve',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    // @ts-ignore
    requestContext: {
      accountId: '123456789012',
      apiId: 'test',
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      path: '/solve',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      resourceId: 'test-resource-id',
      resourcePath: '/solve',
    },
    resource: '/solve',
  });

  describe('Input Validation', () => {
    it('should return 400 if body is missing', async () => {
      const event: APIGatewayProxyEvent = {
        ...createEvent({}),
        body: null,
      };

      const result = await solve(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Request body is required');
    });

    it('should return 400 if numberOfDisks is not a number', async () => {
      const event = createEvent({ numberOfDisks: 'invalid' });

      const result = await solve(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('numberOfDisks must be a number greater than 0');
    });

    it('should return 400 if numberOfDisks is less than 1', async () => {
      const event = createEvent({ numberOfDisks: 0 });

      const result = await solve(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('numberOfDisks must be a number greater than 0');
    });

    it('should return 400 if numberOfDisks is negative', async () => {
      const event = createEvent({ numberOfDisks: -1 });

      const result = await solve(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('numberOfDisks must be a number greater than 0');
    });
  });

  describe('Large Disk Count (>10)', () => {
    it('should return only totalSteps for 11 disks', async () => {
      const event = createEvent({ numberOfDisks: 11 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(Math.pow(2, 11) - 1);
      expect(body.steps).toBeUndefined();
    });

    it('should return only totalSteps for 100 disks', async () => {
      const event = createEvent({ numberOfDisks: 100 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(Math.pow(2, 100) - 1);
      expect(body.steps).toBeUndefined();
    });

    it('should return only totalSteps for 1000 disks', async () => {
      const event = createEvent({ numberOfDisks: 1000 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(Math.pow(2, 1000) - 1);
      expect(body.steps).toBeUndefined();
    });
  });

  describe('Small Disk Count (<=10)', () => {
    it('should solve 1 disk problem', async () => {
      const event = createEvent({ numberOfDisks: 1 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(1);
      expect(body.steps).toHaveLength(1);
      expect(body.steps[0]).toEqual({
        stepNumber: 1,
        from: 'A',
        to: 'C',
        disk: 1,
      });
    });

    it('should solve 3 disk problem', async () => {
      const event = createEvent({ numberOfDisks: 3 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(7);
      expect(body.steps).toHaveLength(7);
      
      // Verify step numbers are sequential
      body.steps.forEach((step: any, index: number) => {
        expect(step.stepNumber).toBe(index + 1);
      });
      
      // Verify all steps have valid pegs
      body.steps.forEach((step: any) => {
        expect(['A', 'B', 'C']).toContain(step.from);
        expect(['A', 'B', 'C']).toContain(step.to);
        expect(step.disk).toBeGreaterThanOrEqual(1);
        expect(step.disk).toBeLessThanOrEqual(3);
      });
      
      // Verify first step: move smallest disk (disk 1)
      expect(body.steps[0].disk).toBe(1);
      
      // Verify last step: all disks should end on peg C
      expect(body.steps[body.steps.length - 1].to).toBe('C');
    });

    it('should solve 10 disk problem', async () => {
      const event = createEvent({ numberOfDisks: 10 });

      const result = await solve(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalSteps).toBe(Math.pow(2, 10) - 1); // 1023 steps
      expect(body.steps).toHaveLength(1023);
      
      // Verify step numbers are sequential
      body.steps.forEach((step: any, index: number) => {
        expect(step.stepNumber).toBe(index + 1);
      });
      
      // Verify all steps have valid structure
      body.steps.forEach((step: any) => {
        expect(['A', 'B', 'C']).toContain(step.from);
        expect(['A', 'B', 'C']).toContain(step.to);
        expect(step.disk).toBeGreaterThanOrEqual(1);
        expect(step.disk).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        ...createEvent({}),
        body: 'invalid json',
      };

      // Suppress console.error for this test since we're intentionally testing error handling
      const originalError = console.error;
      console.error = jest.fn();

      const result = await solve(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');

      // Restore console.error
      console.error = originalError;
    });
  });

});

