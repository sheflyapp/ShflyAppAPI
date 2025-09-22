/**
 * Swagger Documentation Templates for Shfly App API
 * This file contains comprehensive documentation for all API endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ConsultationRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - scheduledAt
 *         - duration
 *         - price
 *       properties:
 *         title:
 *           type: string
 *           description: Consultation title
 *         description:
 *           type: string
 *           description: Consultation description
 *         category:
 *           type: string
 *           description: Category ID
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Scheduled date and time
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         price:
 *           type: number
 *           description: Price in currency
 *         notes:
 *           type: string
 *           description: Additional notes
 *     
 *     ConsultationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             consultation:
 *               $ref: '#/components/schemas/Consultation'
 *     
 *     ConsultationListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             consultations:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Consultation'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *                 totalConsultations:
 *                   type: number
 *                 limit:
 *                   type: number
 *     
 *     ProviderRequest:
 *       type: object
 *       required:
 *         - category
 *         - experience
 *         - hourlyRate
 *       properties:
 *         category:
 *           type: string
 *           description: Category ID
 *         experience:
 *           type: number
 *           description: Years of experience
 *         hourlyRate:
 *           type: number
 *           description: Hourly rate in currency
 *         bio:
 *           type: string
 *           description: Provider bio
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           description: List of specializations
 *         availability:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: time
 *                     end:
 *                       type: string
 *                       format: time
 *     
 *     SeekerRequest:
 *       type: object
 *       properties:
 *         preferences:
 *           type: object
 *           properties:
 *             categories:
 *               type: array
 *               items:
 *                 type: string
 *               description: Preferred categories
 *             maxPrice:
 *               type: number
 *               description: Maximum price willing to pay
 *             preferredTime:
 *               type: string
 *               enum: [morning, afternoon, evening, night]
 *               description: Preferred time of day
 *     
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - consultation
 *         - amount
 *         - paymentMethod
 *       properties:
 *         consultation:
 *           type: string
 *           description: Consultation ID
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Payment currency
 *         paymentMethod:
 *           type: string
 *           description: Payment method
 *         notes:
 *           type: string
 *           description: Payment notes
 *     
 *     ChatMessage:
 *       type: object
 *       required:
 *         - consultation
 *         - sender
 *         - content
 *       properties:
 *         consultation:
 *           type: string
 *           description: Consultation ID
 *         sender:
 *           type: string
 *           description: Sender user ID
 *         content:
 *           type: string
 *           description: Message content
 *         messageType:
 *           type: string
 *           enum: [text, image, file]
 *           default: text
 *           description: Type of message
 *         fileUrl:
 *           type: string
 *           description: File URL for file messages
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - recipient
 *         - title
 *         - message
 *         - type
 *       properties:
 *         recipient:
 *           type: string
 *           description: Recipient user ID
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [consultation, payment, system, reminder]
 *           description: Notification type
 *         data:
 *           type: object
 *           description: Additional data
 *         isRead:
 *           type: boolean
 *           default: false
 *           description: Read status
 *     
 *     SearchQuery:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Search query
 *         category:
 *           type: string
 *           description: Category filter
 *         userType:
 *           type: string
 *           enum: [provider, seeker]
 *           description: User type filter
 *         minPrice:
 *           type: number
 *           description: Minimum price filter
 *         maxPrice:
 *           type: number
 *           description: Maximum price filter
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Minimum rating filter
 *         availability:
 *           type: string
 *           format: date
 *           description: Availability date filter
 *     
 *     UploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             fileUrl:
 *               type: string
 *               description: Uploaded file URL
 *             fileName:
 *               type: string
 *               description: Original file name
 *             fileSize:
 *               type: number
 *               description: File size in bytes
 *             mimeType:
 *               type: string
 *               description: File MIME type
 *     
 *     WalletTransaction:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: User ID
 *         type:
 *           type: string
 *           enum: [credit, debit]
 *           description: Transaction type
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Transaction currency
 *         description:
 *           type: string
 *           description: Transaction description
 *         reference:
 *           type: string
 *           description: Reference ID (consultation, payment, etc.)
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *           default: pending
 *           description: Transaction status
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     WalletBalance:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: User ID
 *         balance:
 *           type: number
 *           description: Current balance
 *         currency:
 *           type: string
 *           default: USD
 *           description: Wallet currency
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */



/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: Get providers
 *     description: Get all providers with filtering and search
 *     tags: [Providers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of providers per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalProviders:
 *                           type: number
 *                         limit:
 *                           type: number
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create provider profile
 *     description: Create or update provider profile
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *     responses:
 *       201:
 *         description: Provider profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Provider profile created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/seekers:
 *   get:
 *     summary: Get seekers
 *     description: Get all seekers (Admin only)
 *     tags: [Seekers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of seekers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Seekers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     seekers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalSeekers:
 *                           type: number
 *                         limit:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create seeker profile
 *     description: Create or update seeker profile
 *     tags: [Seekers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeekerRequest'
 *     responses:
 *       201:
 *         description: Seeker profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Seeker profile created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     seeker:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get payments
 *     description: Get payments with filtering and pagination
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, completed, failed, refunded]
 *         description: Filter by status
 *       - in: query
 *         name: consultation
 *         schema:
 *           type: string
 *         description: Filter by consultation ID
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalPayments:
 *                           type: number
 *                         limit:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create payment
 *     description: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get chats list or messages filtered by chatId/questionId/senderId/providerId
 *     description: 
 *       - Without filters: returns a paginated list of conversations for the current user.
 *       - With any of chatId | questionId | (senderId/providerId): returns messages for the matched conversation.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *         description: Conversation ID to fetch messages for
 *       - in: query
 *         name: questionId
 *         schema:
 *           type: string
 *         description: Question ID to fetch the related conversation messages
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *         description: A participant user ID (commonly the sender). With providerId filters by both participants.
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: A participant user ID (commonly the provider/receiver). With senderId filters by both participants.
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Page size (lists); For messages default is 50 if fetching messages
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChatMessage'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalMessages:
 *                           type: number
 *                         limit:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Send chat message
 *     description: Send a new chat message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search
 *     description: Search for providers, consultations, or categories
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, providers, consultations, categories]
 *           default: all
 *         description: Search type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: object
 *                       properties:
 *                         providers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         consultations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Consultation'
 *                         categories:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Category'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalResults:
 *                           type: number
 *                         limit:
 *                           type: number
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications
 *     description: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only unread notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/NotificationRequest'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalNotifications:
 *                           type: number
 *                         limit:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create notification
 *     description: Create a new notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notification:
 *                       $ref: '#/components/schemas/NotificationRequest'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload file
 *     description: Upload a file (image, document, etc.)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               type:
 *                 type: string
 *                 enum: [profile, consultation, document]
 *                 description: File type
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance
 *     description: Get user's wallet balance and recent transactions
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       $ref: '#/components/schemas/WalletBalance'
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WalletTransaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Add funds to wallet
 *     description: Add funds to user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method
 *     responses:
 *       200:
 *         description: Funds added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Funds added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       $ref: '#/components/schemas/WalletTransaction'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/providers/questions:
 *   get:
 *     summary: Get questions for providers
 *     description: Get questions that match provider's specializations with pagination and filtering
 *     tags: [Provider Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of questions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, answered, closed]
 *           default: all
 *         description: Filter by question status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, low, medium, high, urgent]
 *           default: all
 *         description: Filter by question priority
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           default: all
 *         description: Filter by category ID
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *           default: all
 *         description: Filter by subcategory ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in question description and tags
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastActivityAt, priority, viewCount]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Question'
 *                           - type: object
 *                             properties:
 *                               userId:
 *                                 allOf:
 *                                   - $ref: '#/components/schemas/User'
 *                                   - type: object
 *                                     properties:
 *                                       _id:
 *                                         type: string
 *                                       fullname:
 *                                         type: string
 *                                       username:
 *                                         type: string
 *                                       email:
 *                                         type: string
 *                                       profileImage:
 *                                         type: string
 *                                       bio:
 *                                         type: string
 *                                       country:
 *                                         type: string
 *                                       city:
 *                                         type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                           example: 1
 *                         totalPages:
 *                           type: number
 *                           example: 5
 *                         totalQuestions:
 *                           type: number
 *                           example: 50
 *                         limit:
 *                           type: number
 *                           example: 10
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalQuestions:
 *                           type: number
 *                           description: Total questions matching provider's specializations
 *                         pendingQuestions:
 *                           type: number
 *                           description: Number of pending questions
 *                         answeredQuestions:
 *                           type: number
 *                           description: Number of answered questions
 *                         closedQuestions:
 *                           type: number
 *                           description: Number of closed questions
 *                         urgentQuestions:
 *                           type: number
 *                           description: Number of urgent priority questions
 *                         highPriorityQuestions:
 *                           type: number
 *                           description: Number of high priority questions
 *       400:
 *         description: Bad request - Provider must have specializations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only providers can access this endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: Admin dashboard data
 *     description: Get admin dashboard statistics and data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                           description: Total number of users
 *                         totalConsultations:
 *                           type: number
 *                           description: Total number of consultations
 *                         totalRevenue:
 *                           type: number
 *                           description: Total revenue
 *                         activeProviders:
 *                           type: number
 *                           description: Number of active providers
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             description: Activity type
 *                           description:
 *                             type: string
 *                             description: Activity description
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: string
 *                             description: User ID
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

module.exports = {};



