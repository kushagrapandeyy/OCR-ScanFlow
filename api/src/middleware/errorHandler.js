export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
}
