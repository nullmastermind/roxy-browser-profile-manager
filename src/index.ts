#!/usr/bin/env node
import express from 'express';

const app = express();
const PORT = process.env.PORT || 12345;

app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Hello World</title>
</head>
<body>
	<h1>Hello World</h1>
</body>
</html>
	`);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
