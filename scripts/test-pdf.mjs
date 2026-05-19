const fs = require('fs');
fetch('http://localhost:3000/api/export/inspection/1')
  .then(res => res.buffer())
  .then(buffer => fs.writeFileSync('test.pdf', buffer));
