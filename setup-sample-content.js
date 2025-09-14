const mongoose = require('mongoose');
const StaticContent = require('./models/StaticContent');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shflyapp');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Sample content data
const sampleContent = [
  {
    type: 'privacy-policy',
    title: 'Privacy Policy',
    content: `# Privacy Policy

## Information We Collect
We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.

## How We Use Your Information
We use the information we collect to:
- Provide, maintain, and improve our services
- Process transactions and send related information
- Send technical notices and support messages
- Respond to your comments and questions

## Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent.

## Data Security
We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Contact Us
If you have any questions about this Privacy Policy, please contact us at privacy@shfly.com.`,
    contentAr: `# سياسة الخصوصية

## المعلومات التي نجمعها
نجمع المعلومات التي تقدمها لنا مباشرة، مثل عندما تنشئ حسابًا أو تستخدم خدماتنا أو تتصل بنا للحصول على الدعم.

## كيفية استخدام معلوماتك
نستخدم المعلومات التي نجمعها لـ:
- تقديم خدماتنا والحفاظ عليها وتحسينها
- معالجة المعاملات وإرسال المعلومات ذات الصلة
- إرسال الإشعارات التقنية ورسائل الدعم
- الرد على تعليقاتك وأسئلتك

## مشاركة المعلومات
نحن لا نبيع أو نتاجر أو ننقل معلوماتك الشخصية إلى أطراف ثالثة دون موافقتك.

## أمان البيانات
نطبق تدابير أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الكشف أو التدمير.

## اتصل بنا
إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على privacy@shfly.com.`,
    version: '1.0.0',
    seoTitle: 'Privacy Policy - Shfly Consultation App',
    seoDescription: 'Learn about how Shfly protects your privacy and personal information in our consultation platform.',
    seoKeywords: ['privacy', 'policy', 'data protection', 'shfly', 'consultation', 'security']
  },
  {
    type: 'terms-conditions',
    title: 'Terms and Conditions',
    content: `# Terms and Conditions

## Acceptance of Terms
By accessing and using Shfly, you accept and agree to be bound by the terms and provision of this agreement.

## Use License
Permission is granted to temporarily download one copy of Shfly for personal, non-commercial transitory viewing only.

## Disclaimer
The materials on Shfly are provided on an 'as is' basis. Shfly makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.

## Limitations
In no event shall Shfly or its suppliers be liable for any damages arising out of the use or inability to use the materials on Shfly.

## Accuracy of Materials
The materials appearing on Shfly could include technical, typographical, or photographic errors.

## Links
Shfly has not reviewed all of the sites linked to our website and is not responsible for the contents of any such linked site.

## Modifications
Shfly may revise these terms of service at any time without notice.

## Governing Law
These terms and conditions are governed by and construed in accordance with the laws of the United States.`,
    contentAr: `# الشروط والأحكام

## قبول الشروط
من خلال الوصول إلى Shfly واستخدامه، فإنك تقبل وتوافق على الالتزام بشروط وأحكام هذه الاتفاقية.

## ترخيص الاستخدام
يُمنح الإذن لتحميل نسخة واحدة مؤقتة من Shfly للعرض الشخصي وغير التجاري المؤقت فقط.

## إخلاء المسؤولية
يتم توفير المواد الموجودة على Shfly على أساس "كما هي". لا تقدم Shfly أي ضمانات، صريحة أو ضمنية، وتتخلى هنا عن جميع الضمانات الأخرى.

## القيود
في أي حال من الأحوال، لن تكون Shfly أو موردوها مسؤولين عن أي أضرار ناشئة عن استخدام أو عدم القدرة على استخدام المواد الموجودة على Shfly.

## دقة المواد
قد تتضمن المواد التي تظهر على Shfly أخطاء تقنية أو مطبعية أو فوتوغرافية.

## الروابط
لم تراجع Shfly جميع المواقع المرتبطة بموقعنا على الويب وليست مسؤولة عن محتويات أي موقع مرتبط.

## التعديلات
قد تقوم Shfly بمراجعة شروط الخدمة هذه في أي وقت دون إشعار.

## القانون الحاكم
تحكم هذه الشروط والأحكام وتفسر وفقًا لقوانين الولايات المتحدة.`,
    version: '1.0.0',
    seoTitle: 'Terms and Conditions - Shfly Consultation App',
    seoDescription: 'Read the terms and conditions for using Shfly consultation platform and services.',
    seoKeywords: ['terms', 'conditions', 'agreement', 'shfly', 'consultation', 'legal']
  },
  {
    type: 'help',
    title: 'Help Center',
    content: `# Help Center

## Getting Started
Welcome to Shfly! This guide will help you get started with our consultation platform.

## How to Book a Consultation
1. Search for a consultant in your area
2. View their profile and reviews
3. Select a convenient time slot
4. Complete the booking process
5. Attend your consultation

## Managing Your Account
- Update your profile information
- View your consultation history
- Manage your payment methods
- Update your preferences

## Payment and Billing
- All payments are processed securely
- You can pay using credit cards or digital wallets
- Refunds are processed within 5-7 business days

## Technical Support
If you're experiencing technical issues:
1. Check your internet connection
2. Clear your browser cache
3. Try using a different browser
4. Contact our support team

## Frequently Asked Questions

### Q: How do I cancel a consultation?
A: You can cancel up to 24 hours before your scheduled time.

### Q: Can I reschedule my consultation?
A: Yes, you can reschedule up to 12 hours before your appointment.

### Q: How do I contact my consultant?
A: You can message them through the chat feature in the app.

## Contact Support
Email: support@shfly.com
Phone: +1 (555) 123-4567
Hours: Monday-Friday, 9 AM - 6 PM EST`,
    contentAr: `# مركز المساعدة

## البدء
مرحبًا بك في Shfly! سيساعدك هذا الدليل على البدء مع منصة الاستشارات الخاصة بنا.

## كيفية حجز استشارة
1. ابحث عن مستشار في منطقتك
2. اعرض ملفه الشخصي ومراجعاته
3. اختر وقتًا مناسبًا
4. أكمل عملية الحجز
5. احضر استشارتك

## إدارة حسابك
- تحديث معلومات ملفك الشخصي
- عرض تاريخ استشاراتك
- إدارة طرق الدفع الخاصة بك
- تحديث تفضيلاتك

## الدفع والفواتير
- تتم معالجة جميع المدفوعات بأمان
- يمكنك الدفع باستخدام بطاقات الائتمان أو المحافظ الرقمية
- تتم معالجة المبالغ المستردة خلال 5-7 أيام عمل

## الدعم التقني
إذا كنت تواجه مشاكل تقنية:
1. تحقق من اتصالك بالإنترنت
2. امسح ذاكرة التخزين المؤقت للمتصفح
3. جرب استخدام متصفح مختلف
4. اتصل بفريق الدعم الخاص بنا

## الأسئلة الشائعة

### س: كيف يمكنني إلغاء استشارة؟
ج: يمكنك الإلغاء حتى 24 ساعة قبل وقتك المجدول.

### س: هل يمكنني إعادة جدولة استشارتي؟
ج: نعم، يمكنك إعادة الجدولة حتى 12 ساعة قبل موعدك.

### س: كيف يمكنني الاتصال بمستشاري؟
ج: يمكنك مراسلتهم من خلال ميزة الدردشة في التطبيق.

## اتصل بالدعم
البريد الإلكتروني: support@shfly.com
الهاتف: +1 (555) 123-4567
الساعات: الاثنين-الجمعة، 9 صباحًا - 6 مساءً بتوقيت شرق الولايات المتحدة`,
    version: '1.0.0',
    seoTitle: 'Help Center - Shfly Consultation App',
    seoDescription: 'Get help and support for using Shfly consultation platform. Find answers to common questions and contact support.',
    seoKeywords: ['help', 'support', 'guide', 'shfly', 'consultation', 'faq']
  },
  {
    type: 'onboarding',
    title: 'Welcome to Shfly',
    content: `# Welcome to Shfly!

## Your Journey to Better Health Starts Here

Shfly connects you with qualified healthcare professionals for personalized consultations from the comfort of your home.

## What You Can Do:
- **Book Consultations** with certified doctors and specialists
- **Get Expert Advice** on health, wellness, and medical concerns
- **Schedule Appointments** at your convenience
- **Access Your Medical History** and consultation records
- **Chat with Professionals** in real-time

## Getting Started:
1. **Create Your Account** - Sign up with your email or phone
2. **Complete Your Profile** - Add your health information and preferences
3. **Find a Professional** - Browse our network of qualified healthcare providers
4. **Book Your First Consultation** - Schedule an appointment that works for you
5. **Start Your Health Journey** - Get the care you need, when you need it

## Why Choose Shfly?
- **Convenient** - Consult from anywhere, anytime
- **Secure** - Your privacy and data are protected
- **Professional** - Only verified and licensed healthcare providers
- **Affordable** - Transparent pricing with no hidden fees
- **Reliable** - 24/7 support and assistance

Ready to take control of your health? Let's get started!`,
    contentAr: `# مرحبًا بك في Shfly!

## رحلتك نحو صحة أفضل تبدأ هنا

يربطك Shfly بأخصائيي الرعاية الصحية المؤهلين للحصول على استشارات شخصية من راحة منزلك.

## ما يمكنك فعله:
- **احجز استشارات** مع أطباء وأخصائيين معتمدين
- **احصل على نصائح الخبراء** حول الصحة والعافية والمخاوف الطبية
- **جدول المواعيد** في الوقت المناسب لك
- **الوصول إلى تاريخك الطبي** وسجلات الاستشارات
- **تحدث مع المحترفين** في الوقت الفعلي

## البدء:
1. **أنشئ حسابك** - سجل مع بريدك الإلكتروني أو هاتفك
2. **أكمل ملفك الشخصي** - أضف معلوماتك الصحية وتفضيلاتك
3. **ابحث عن محترف** - تصفح شبكتنا من مقدمي الرعاية الصحية المؤهلين
4. **احجز استشارتك الأولى** - جدول موعدًا يناسبك
5. **ابدأ رحلتك الصحية** - احصل على الرعاية التي تحتاجها، عندما تحتاجها

## لماذا تختار Shfly؟
- **مريح** - استشر من أي مكان، في أي وقت
- **آمن** - خصوصيتك وبياناتك محمية
- **مهني** - مقدمي رعاية صحية معتمدين ومرخصين فقط
- **بأسعار معقولة** - أسعار شفافة بدون رسوم خفية
- **موثوق** - دعم ومساعدة على مدار الساعة

مستعد للسيطرة على صحتك؟ دعنا نبدأ!`,
    version: '1.0.0',
    seoTitle: 'Welcome to Shfly - Get Started with Health Consultations',
    seoDescription: 'Start your health journey with Shfly. Connect with qualified healthcare professionals for personalized consultations.',
    seoKeywords: ['welcome', 'onboarding', 'health', 'consultation', 'shfly', 'getting started']
  }
];

async function setupSampleContent() {
  try {
    await connectDB();
    
    console.log('📝 Setting up sample static content...\n');
    
    for (const contentData of sampleContent) {
      try {
        // Check if content already exists
        const existingContent = await StaticContent.findOne({ type: contentData.type });
        
        if (existingContent) {
          console.log(`⚠️ ${contentData.type} already exists, skipping...`);
          continue;
        }
        
        // Create new content
        const content = new StaticContent({
          ...contentData,
          lastUpdatedBy: new mongoose.Types.ObjectId() // Dummy admin ID
        });
        
        await content.save();
        console.log(`✅ Created ${contentData.type} content`);
        
      } catch (error) {
        console.log(`❌ Error creating ${contentData.type}:`, error.message);
      }
    }
    
    console.log('\n🎉 Sample content setup completed!');
    console.log('==================================');
    console.log('✅ Privacy Policy created');
    console.log('✅ Terms and Conditions created');
    console.log('✅ Help Center created');
    console.log('✅ Onboarding content created');
    
    console.log('\n📋 Test the APIs:');
    console.log('================');
    console.log('1. Get all content: GET /api/content');
    console.log('2. Get privacy policy: GET /api/content/privacy-policy');
    console.log('3. Get terms in Arabic: GET /api/content/terms-conditions?lang=ar');
    console.log('4. Admin panel: http://localhost:5000/admin-content-management.html');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

setupSampleContent();
