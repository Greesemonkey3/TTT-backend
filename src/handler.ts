import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface SolveRequest {
  numberOfDisks: number;
}

type Peg = 'A' | 'B' | 'C';

interface Step {
  stepNumber: number;
  from: Peg;
  to: Peg;
  disk: number;
}

interface SolutionResponse {
  steps: Step[];
  totalSteps: number;
}

interface TotalStepsResponse {
  totalSteps: number;
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const solve = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: '',
    };
  }

  try {

    if (!event.body) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const requestBody: SolveRequest = JSON.parse(event.body);
    const { numberOfDisks } = requestBody;

    // Input validation
    if (typeof numberOfDisks !== 'number' || numberOfDisks < 1) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'numberOfDisks must be a number greater than 0' }),
      };
    }

    if (numberOfDisks > 10) {
      const totalSteps = Math.pow(2, numberOfDisks) - 1;
      const response: TotalStepsResponse = { totalSteps };
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(response),
      };
    }

    const steps: Step[] = [];
    let stepCounter = 1;

    const solveProblem = (
      n: number,
      from: Peg,
      to: Peg,
      aux: Peg
    ): void => {
      if (n === 1) {
        steps.push({
          stepNumber: stepCounter++,
          from,
          to,
          disk: 1,
        });
        return;
      }

      solveProblem(n - 1, from, aux, to);

      steps.push({
        stepNumber: stepCounter++,
        from,
        to,
        disk: n,
      });

      solveProblem(n - 1, aux, to, from);
    };

    solveProblem(numberOfDisks, 'A', 'C', 'B');

    const response: SolutionResponse = {
      steps,
      totalSteps: steps.length,
    };

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
// trace for 3 disk problem
// solveProblem (n,from, to, aux)
// Call #1 solveProblem(3, A, C, B) - line 87
//     Call #2 solveProblem(2, A, B, C) - line 75
//         Call #3 solveProblem(1, A, C, B) - line 75
//             Push step 1: { disk: 1, from: A, to: C } - line 66
//         Return from Call #3 - line 71
//         Push step 2: { disk: 2, from: A, to: B } - line 77
//         Call #4 solveProblem(1, C, B, A) - line 84
//             Push step 3: { disk: 1, from: C, to: B } - line 66
//         Return from Call #4 - line 71
//     Return from Call #2 - line 84
//     Push step 4: { disk: 3, from: A, to: C } - line 77
//     Call #5 solveProblem(2, B, C, A) - line 84
//         Call #6 solveProblem(1, B, A, C) - line 75
//             Push step 5: { disk: 1, from: B, to: A } - line 66
//         Return from Call #6 - line 71
//         Push step 6: { disk: 2, from: B, to: C } - line 77
//         Call #7 solveProblem(1, A, C, B) - line 84
//             Push step 7: { disk: 1, from: A, to: C } - line 66
//         Return from Call #7 - line 71
//     Return from Call #5 - line 84
// Return from Call #1 - line 87
