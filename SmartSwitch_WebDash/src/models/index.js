const User = require('./User');
const Place = require('./Place');
const Board = require('./Board');
const Switch = require('./Switch');
const Schedule = require('./Schedule');
const Routine = require('./Routine');

// Define associations with unique aliases
User.associate({ Place, Board, Schedule, Routine });
Place.associate({ User, Board, Schedule, Routine });
Board.associate({ Place, User, Switch, Schedule, Routine });
Switch.associate({ Board, Schedule });
Schedule.associate({ Switch, Board, Place, User });
Routine.associate({ Board, Place, User });

module.exports = {
  User,
  Place,
  Board,
  Switch,
  Schedule,
  Routine
};