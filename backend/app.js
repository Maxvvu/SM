const studentsRouter = require('../src/routes/students')
const behaviorsRouter = require('../src/routes/behaviors')
const behaviorTypesRouter = require('../src/routes/behaviorTypes')
const statisticsRouter = require('../src/routes/statistics')

app.use('/api/students', studentsRouter)
app.use('/api/behaviors', behaviorsRouter)
app.use('/api/behavior-types', behaviorTypesRouter)
app.use('/api/statistics', statisticsRouter) 