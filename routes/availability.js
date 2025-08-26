const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireProvider } = require('../middleware/roleAuth');
const Availability = require('../models/Availability');
const User = require('../models/User');

/**
 * @swagger
 * /api/availability:
 *   get:
 *     summary: Get availability for a provider
 *     tags: [Availability - Provider]
 *     parameters:
 *       - in: query
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific date (YYYY-MM-DD)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date range (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { provider, date, startDate, endDate } = req.query;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }

    const filter = { provider };

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const availability = await Availability.find(filter)
      .populate('provider', 'fullname username profileImage')
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/availability:
 *   post:
 *     summary: Set availability for a provider
 *     tags: [Availability - Provider]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date (YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 description: Start time (HH:MM)
 *               endTime:
 *                 type: string
 *                 description: End time (HH:MM)
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the time slot is available
 *               maxBookings:
 *                 type: integer
 *                 default: 1
 *                 description: Maximum number of bookings for this slot
 *               price:
 *                 type: number
 *                 description: Price for this time slot
 *     responses:
 *       201:
 *         description: Availability set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only providers can set availability
 *       500:
 *         description: Server error
 */
router.post('/', auth, requireProvider, async (req, res) => {
  try {
    const { date, startTime, endTime, isAvailable = true, maxBookings = 1, price } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, and end time are required'
      });
    }

    // Validate date format
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM (24-hour format)'
      });
    }

    // Check if end time is after start time
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Check if date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot set availability for past dates'
      });
    }

    // Check for overlapping availability
    const overlapping = await Availability.findOne({
      provider: req.user.id,
      date: targetDate,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'Time slot overlaps with existing availability'
      });
    }

    // Create availability
    const availability = new Availability({
      provider: req.user.id,
      date: targetDate,
      startTime,
      endTime,
      isAvailable,
      maxBookings,
      price: price || req.user.price
    });

    await availability.save();

    res.status(201).json({
      success: true,
      message: 'Availability set successfully',
      data: availability
    });
  } catch (error) {
    console.error('Error setting availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/availability/bulk:
 *   post:
 *     summary: Set bulk availability for multiple dates
 *     tags: [Availability - Provider]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dates
 *               - startTime
 *               - endTime
 *             properties:
 *               dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *                 description: Array of dates (YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 description: Start time (HH:MM)
 *               endTime:
 *                 type: string
 *                 description: End time (HH:MM)
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *               maxBookings:
 *                 type: integer
 *                 default: 1
 *               price:
 *                 type: number
 *                 description: Price for these time slots
 *     responses:
 *       201:
 *         description: Bulk availability set successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/bulk', auth, requireProvider, async (req, res) => {
  try {
    const { dates, startTime, endTime, isAvailable = true, maxBookings = 1, price } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates array is required and must not be empty'
      });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time are required'
      });
    }

    const availabilities = [];
    const errors = [];

    for (const dateStr of dates) {
      try {
        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) {
          errors.push(`Invalid date format: ${dateStr}`);
          continue;
        }

        // Check if date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
          errors.push(`Cannot set availability for past date: ${dateStr}`);
          continue;
        }

        // Check for overlapping availability
        const overlapping = await Availability.findOne({
          provider: req.user.id,
          date: targetDate,
          $or: [
            {
              startTime: { $lt: endTime },
              endTime: { $gt: startTime }
            }
          ]
        });

        if (overlapping) {
          errors.push(`Time slot overlaps with existing availability on ${dateStr}`);
          continue;
        }

        const availability = new Availability({
          provider: req.user.id,
          date: targetDate,
          startTime,
          endTime,
          isAvailable,
          maxBookings,
          price: price || req.user.price
        });

        availabilities.push(availability);
      } catch (error) {
        errors.push(`Error processing date ${dateStr}: ${error.message}`);
      }
    }

    if (availabilities.length > 0) {
      await Availability.insertMany(availabilities);
    }

    res.status(201).json({
      success: true,
      message: `Bulk availability set successfully. ${availabilities.length} slots created.`,
      data: {
        created: availabilities.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Error setting bulk availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/availability/{id}:
 *   put:
 *     summary: Update availability
 *     tags: [Availability - Provider]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 description: Updated start time
 *               endTime:
 *                 type: string
 *                 description: Updated end time
 *               isAvailable:
 *                 type: boolean
 *                 description: Updated availability status
 *               maxBookings:
 *                 type: integer
 *                 description: Updated max bookings
 *               price:
 *                 type: number
 *                 description: Updated price
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - cannot edit others' availability
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, requireProvider, async (req, res) => {
  try {
    const { startTime, endTime, isAvailable, maxBookings, price } = req.body;
    
    const availability = await Availability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    // Check if user owns this availability
    if (availability.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own availability'
      });
    }

    // Update fields
    if (startTime !== undefined) availability.startTime = startTime;
    if (endTime !== undefined) availability.endTime = endTime;
    if (isAvailable !== undefined) availability.isAvailable = isAvailable;
    if (maxBookings !== undefined) availability.maxBookings = maxBookings;
    if (price !== undefined) availability.price = price;

    // Validate time if updated
    if (startTime || endTime) {
      const start = new Date(`2000-01-01T${availability.startTime}:00`);
      const end = new Date(`2000-01-01T${availability.endTime}:00`);
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    await availability.save();

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: availability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/availability/{id}:
 *   delete:
 *     summary: Delete availability
 *     tags: [Availability - Provider]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID
 *     responses:
 *       200:
 *         description: Availability deleted successfully
 *       403:
 *         description: Forbidden - cannot delete others' availability
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, requireProvider, async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    // Check if user owns this availability
    if (availability.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own availability'
      });
    }

    await Availability.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/availability/weekly:
 *   get:
 *     summary: Get weekly availability for a provider
 *     tags: [Availability - Provider]
 *     parameters:
 *       - in: query
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider ID
 *       - in: query
 *         name: weekStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Start of week (YYYY-MM-DD). Defaults to current week
 *     responses:
 *       200:
 *         description: Weekly availability retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/weekly', async (req, res) => {
  try {
    const { provider, weekStart } = req.query;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }

    // Calculate week start (Monday)
    let startDate;
    if (weekStart) {
      startDate = new Date(weekStart);
    } else {
      startDate = new Date();
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startDate = new Date(startDate.setDate(diff));
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const availability = await Availability.find({
      provider,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1, startTime: 1 });

    // Group by day
    const weeklySchedule = {};
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      weeklySchedule[dateStr] = availability.filter(av => 
        av.date.toISOString().split('T')[0] === dateStr
      );
    }

    res.json({
      success: true,
      data: {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        schedule: weeklySchedule
      }
    });
  } catch (error) {
    console.error('Error fetching weekly availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
