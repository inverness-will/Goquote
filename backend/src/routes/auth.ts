import { Request, Response, NextFunction } from 'express';

// ... other existing code here

// Example route handler updated with type annotations

// Line 64
app.get('/example', (req: Request, res: Response, next: NextFunction) => {
  // handler code
});

// Line 88
app.post('/example', (req: Request, res: Response, next: NextFunction) => {
  // handler code
});

// Line 115
app.put('/example', (req: Request, res: Response, next: NextFunction) => {
  // handler code
});

// Line 137
app.delete('/example', (req: Request, res: Response, next: NextFunction) => {
  // handler code
});

// Line 152
app.patch('/example', (req: Request, res: Response, next: NextFunction) => {
  // handler code
});

// ... other existing code here