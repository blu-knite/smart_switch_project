const { Place, Board, Switch } = require('../models');

exports.getAllPlaces = async (req, res) => {
  try {
    const places = await Place.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Board,
          as: 'boards',
          attributes: ['id', 'uid', 'name', 'icon', 'isOnline']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get switch counts for each place
    const placesWithStats = await Promise.all(
      places.map(async (place) => {
        let switchCount = 0;
        for (const board of place.boards) {
          const count = await Switch.count({ where: { boardId: board.id } });
          switchCount += count;
        }
        return {
          ...place.toJSON(),
          switchCount
        };
      })
    );

    res.json(placesWithStats);
  } catch (error) {
    console.error('Get places error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPlaceById = async (req, res) => {
  try {
    const place = await Place.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Board,
          as: 'boards',
          include: [
            {
              model: Switch,
              as: 'switches',
              order: [['index', 'ASC']]
            }
          ]
        }
      ]
    });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    console.error('Get place error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPlace = async (req, res) => {
  try {
    const place = await Place.create({
      ...req.body,
      userId: req.user.id
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('place:created', place);

    res.status(201).json(place);
  } catch (error) {
    console.error('Create place error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePlace = async (req, res) => {
  try {
    const place = await Place.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    await place.update(req.body);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('place:updated', place);

    res.json(place);
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePlace = async (req, res) => {
  try {
    const place = await Place.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Check if place has boards
    const boardCount = await Board.count({ where: { placeId: place.id } });
    if (boardCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete place with existing boards. Delete boards first.' 
      });
    }

    await place.destroy();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('place:deleted', { id: parseInt(req.params.id) });

    res.json({ message: 'Place deleted successfully' });
  } catch (error) {
    console.error('Delete place error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPlaceStats = async (req, res) => {
  try {
    const place = await Place.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [{ model: Board, as: 'boards' }]
    });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    let totalSwitches = 0;
    let activeSwitches = 0;
    let totalPower = 0;

    for (const board of place.boards) {
      const switches = await Switch.findAll({ where: { boardId: board.id } });
      totalSwitches += switches.length;
      activeSwitches += switches.filter(s => s.state).length;
      totalPower += switches.reduce((sum, s) => s.state ? sum + s.power : sum, 0);
    }

    res.json({
      placeId: place.id,
      placeName: place.name,
      boardCount: place.boards.length,
      totalSwitches,
      activeSwitches,
      totalPower,
      occupancy: activeSwitches > 0 ? 'active' : 'inactive'
    });
  } catch (error) {
    console.error('Get place stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
