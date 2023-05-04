const express = require("express")
const app = express()
const mongoose = require("mongoose")


app.use(express.json());

mongoose.connect("mongodb+srv://webApiTravelAgency:rO8WIDz95Bo8upc9@webapitravelagency.y8zzxot.mongodb.net/test")

// Hotel search endpoint
app.post('/hotels/search', async (req, res) => {
    try {
        const { destination, checkInDate, checkOutDate, starRating } = req.body;

        // Build the query object
        const query = { destination };
        if (starRating) {
            query.starRating = starRating;
        }

        // Find hotels that match the query
        const hotels = await Hotel.find(query);

        // Filter the hotels by availability
        const filteredHotels = hotels.filter(hotel => {
            const { deluxeRoom, superDeluxeRoom, suiteRoom } = hotel;
            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkOutDate);

            // Check deluxe rooms
            if (deluxeRoom.availableRooms > 0) {
                const bookedDates = deluxeRoom.bookedDates || [];
                const overlaps = bookedDates.some(range => {
                    const rangeStart = new Date(range.start);
                    const rangeEnd = new Date(range.end);
                    return checkIn < rangeEnd && rangeStart < checkOut;
                });
                return !overlaps;
            }

            // Check super deluxe rooms
            if (superDeluxeRoom.availableRooms > 0) {
                const bookedDates = superDeluxeRoom.bookedDates || [];
                const overlaps = bookedDates.some(range => {
                    const rangeStart = new Date(range.start);
                    const rangeEnd = new Date(range.end);
                    return checkIn < rangeEnd && rangeStart < checkOut;
                });
                return !overlaps;
            }

            // Check suite rooms
            if (suiteRoom.availableRooms > 0) {
                const bookedDates = suiteRoom.bookedDates || [];
                const overlaps = bookedDates.some(range => {
                    const rangeStart = new Date(range.start);
                    const rangeEnd = new Date(range.end);
                    return checkIn < rangeEnd && rangeStart < checkOut;
                });
                return !overlaps;
            }

            // No available rooms
            return false;
        });

        res.json(filteredHotels);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Hotel booking endpoint
app.post('/hotels/:Id/book', async (req, res) => {
    try {
    const { Id } = req.params;
    const { roomType, boardBasis, checkInDate, checkOutDate } = req.body;

    // Find the hotel by ID
    const hotel = await Hotel.findById(Id);

    // Find the room availability
    let room, bookedDates;
    switch (roomType) {
        case 'deluxe':
            room = hotel.deluxeRoom;
            bookedDates = room.bookedDates || [];
            break;
        case 'superDeluxe':
            room = hotel.superDeluxeRoom;
            bookedDates = room.bookedDates || [];
            break                
        case 'superDeluxe':
            room = hotel.superDeluxeRoom;
            bookedDates = room.bookedDates || [];
            break;
        default:
            return res.status(400).json({ message: 'Invalid room type' });
        }

    // Check availability
    if (room.availableRooms <= 0) {
      return res.status(400).json({ message: 'Room not available' });
    }

    // Check availability for the given dates
    const selectedDates = getDatesBetween(checkInDate, checkOutDate);
    const overlappingDates = bookedDates.filter(date => selectedDates.includes(date));
    if (overlappingDates.length > 0) {
      return res.status(400).json({ message: 'Room not available for the selected dates' });
    }

    // Update availability
    room.availableRooms -= 1;
    room.bookedDates = bookedDates.concat(selectedDates);
    await hotel.save();

    // Create booking
    const booking = {
        hotel: hotel._id,
        roomType,
        boardBasis,
        checkInDate,
        checkOutDate,
    };

    res.json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error booking hotel' });
    }
});

// Search and filter hotels
app.get('/hotels', async (req, res) => {
    try {
      const { starRating, price, hasPool, hasKidsPlayArea, hasGym, hasBeachAccess } = req.query;
      const query = {};
      if (starRating) {
        query.starRating = starRating;
      }
      if (price) {
        query.price = { $lte: price };
      }
      if (hasPool) {
        query.hasPool = hasPool;
      }
      if (hasKidsPlayArea) {
        query.hasKidsPlayArea = hasKidsPlayArea;
      }
      if (hasGym) {
        query.hasGym = hasGym;
      }
      if (hasBeachAccess) {
        query.hasBeachAccess = hasBeachAccess;
      }
      const hotels = await Hotel.find(query);
      res.json(hotels);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create a new booking
app.post('/hotels', async (req, res) => {
    try {
        const { starRating, price, hasPool, hasKidsPlayArea, hasGym, hasBeachAccess } = req.query;
        const query = {};
        if (starRating) {
          query.starRating = starRating;
        }
        if (price) {
          query.price = { $lte: price };
        }
        if (hasPool) {
          query.hasPool = hasPool;
        }
        if (hasKidsPlayArea) {
          query.hasKidsPlayArea = hasKidsPlayArea;
        }
        if (hasGym) {
          query.hasGym = hasGym;
        }
        if (hasBeachAccess) {
          query.hasBeachAccess = hasBeachAccess;
        }
        const hotels = await Hotel.find(query);
        res.json(hotels);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});



// Add a hotel to cart
app.post('/cart', async (req, res) => {
  const { Id, roomType, boardBasis } = req.body;

  try {
    const hotel = await Hotel.findById(Id);

    if (!hotel) return res.status(404).send('Hotel not found');

    let roomPrice = null;
    let availableRooms = null;

    if (roomType === 'deluxe') {
      roomPrice = hotel.deluxeRoom.price[boardBasis];
      availableRooms = hotel.deluxeRoom.availableRooms;
    } else if (roomType === 'superDeluxe') {
      roomPrice = hotel.superDeluxeRoom.price[boardBasis];
      availableRooms = hotel.superDeluxeRoom.availableRooms;
    } else if (roomType === 'suite') {
      roomPrice = hotel.suiteRoom.price[boardBasis];
      availableRooms = hotel.suiteRoom.availableRooms;
    } else {
      return res.status(400).send('Invalid room type');
    }

    if (availableRooms < 1) return res.status(400).send('No available rooms of this type');

    const cartItem = { Id, roomType, boardBasis, roomPrice };
    req.session.cart.push(cartItem);

    res.json(cartItem);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});


// Checkout
app.post('/checkout', async (req, res) => {
  const { cart } = req.session;

  if (!cart || cart.length < 1) return res.status(400).send('Cart is empty');

  try {
    // Calculate total amount and reduce available rooms
    const Ids = cart.map(item => item.Id);
    const hotels = await Hotel.find({ _id: { $in: Ids } });

    let totalAmount = 0;
    for (const item of cart) {
      const hotel = hotels.find(h => h._id.toString() === item.Id);

      let roomPrice = null;
      if (item.roomType === 'deluxe') {
        roomPrice = hotel.deluxeRoom.price[item.boardBasis];
        hotel.deluxeRoom.availableRooms--;
      } else if (item.roomType === 'superDeluxe') {
        roomPrice = hotel.superDeluxeRoom.price[item.boardBasis];
        hotel.superDeluxeRoom.availableRooms--;
      }else if (item.roomType === 'suite') {
        roomPrice = hotel.suiteRoom.price[item.boardBasis];
        hotel.suiteRoom.availableRooms--;
      }
      totalAmount += roomPrice;
    }
      req.session.cart = [];
      res.json({ totalAmount });

    }catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});