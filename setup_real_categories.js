const mongoose = require('mongoose');
const Category = require('./models/Category');
const User = require('./models/User');
require('dotenv').config({ path: './config.env' });

// Real-world consultation categories and subcategories
const consultationCategories = [
  {
    name: 'Mental Health & Psychology',
    description: 'Professional mental health services and psychological counseling',
    color: '#8B5CF6',
    icon: 'brain',
    featured: true,
    sortOrder: 1,
    subcategories: [
      { name: 'Anxiety & Stress', description: 'Anxiety disorders, stress management, panic attacks', color: '#A78BFA' },
      { name: 'Depression', description: 'Depression treatment, mood disorders, emotional support', color: '#C4B5FD' },
      { name: 'Trauma & PTSD', description: 'Post-traumatic stress, trauma recovery, EMDR therapy', color: '#DDD6FE' },
      { name: 'Relationship Counseling', description: 'Couples therapy, marriage counseling, family issues', color: '#EDE9FE' },
      { name: 'Addiction Recovery', description: 'Substance abuse, behavioral addictions, recovery support', color: '#F3F4F6' },
      { name: 'Child & Adolescent', description: 'Youth counseling, behavioral issues, developmental support', color: '#F9FAFB' }
    ]
  },
  {
    name: 'Health & Wellness',
    description: 'Physical and mental wellness consultations',
    color: '#10B981',
    icon: 'heart',
    featured: true,
    sortOrder: 2,
    subcategories: [
      { name: 'Nutrition & Diet', description: 'Dietary planning, weight management, nutritional counseling', color: '#34D399' },
      { name: 'Fitness & Exercise', description: 'Personal training, workout plans, fitness coaching', color: '#6EE7B7' },
      { name: 'Sleep Disorders', description: 'Insomnia treatment, sleep hygiene, sleep coaching', color: '#A7F3D0' },
      { name: 'Chronic Pain', description: 'Pain management, chronic condition support', color: '#D1FAE5' },
      { name: 'Women\'s Health', description: 'Reproductive health, menopause, pregnancy support', color: '#ECFDF5' },
      { name: 'Men\'s Health', description: 'Men\'s wellness, testosterone, aging concerns', color: '#F0FDF4' }
    ]
  },
  {
    name: 'Business & Career',
    description: 'Professional development and business consulting',
    color: '#F59E0B',
    icon: 'briefcase',
    featured: true,
    sortOrder: 3,
    subcategories: [
      { name: 'Career Coaching', description: 'Job search, career transitions, professional development', color: '#FBBF24' },
      { name: 'Leadership Development', description: 'Management skills, team building, executive coaching', color: '#FCD34D' },
      { name: 'Entrepreneurship', description: 'Startup advice, business planning, funding strategies', color: '#FDE68A' },
      { name: 'Marketing & Sales', description: 'Digital marketing, sales strategies, brand building', color: '#FEF3C7' },
      { name: 'Financial Planning', description: 'Investment advice, retirement planning, budgeting', color: '#FFFBEB' },
      { name: 'Public Speaking', description: 'Presentation skills, communication, confidence building', color: '#FEFEFE' }
    ]
  },
  {
    name: 'Technology & Digital',
    description: 'Technology consulting and digital transformation',
    color: '#3B82F6',
    icon: 'computer',
    featured: true,
    sortOrder: 4,
    subcategories: [
      { name: 'Software Development', description: 'Programming, web development, mobile apps', color: '#60A5FA' },
      { name: 'Data Science & AI', description: 'Machine learning, data analysis, artificial intelligence', color: '#93C5FD' },
      { name: 'Cybersecurity', description: 'Security consulting, threat assessment, compliance', color: '#BFDBFE' },
      { name: 'Cloud Computing', description: 'AWS, Azure, Google Cloud, infrastructure setup', color: '#DBEAFE' },
      { name: 'Digital Marketing', description: 'SEO, social media, online advertising, analytics', color: '#EFF6FF' },
      { name: 'IT Support', description: 'Technical support, system administration, troubleshooting', color: '#F8FAFC' }
    ]
  },
  {
    name: 'Education & Learning',
    description: 'Educational consulting and learning support',
    color: '#EF4444',
    icon: 'academic-cap',
    featured: true,
    sortOrder: 5,
    subcategories: [
      { name: 'Academic Tutoring', description: 'Subject-specific tutoring, test preparation, study skills', color: '#F87171' },
      { name: 'Language Learning', description: 'Foreign languages, ESL, conversation practice', color: '#FCA5A5' },
      { name: 'Special Education', description: 'Learning disabilities, ADHD support, special needs', color: '#FECACA' },
      { name: 'Online Learning', description: 'E-learning strategies, course design, digital education', color: '#FEE2E2' },
      { name: 'Study Abroad', description: 'International education, visa guidance, cultural adaptation', color: '#FEF2F2' },
      { name: 'Professional Certifications', description: 'Industry certifications, skill development, training', color: '#FFFAFA' }
    ]
  },
  {
    name: 'Creative & Arts',
    description: 'Creative consulting and artistic development',
    color: '#EC4899',
    icon: 'palette',
    featured: false,
    sortOrder: 6,
    subcategories: [
      { name: 'Writing & Content', description: 'Creative writing, content creation, editing services', color: '#F472B6' },
      { name: 'Graphic Design', description: 'Logo design, branding, visual identity, UI/UX', color: '#F9A8D4' },
      { name: 'Music & Audio', description: 'Music production, audio editing, sound design', color: '#FBCFE8' },
      { name: 'Photography', description: 'Photography techniques, editing, business advice', color: '#FCE7F3' },
      { name: 'Video Production', description: 'Video editing, filmmaking, content creation', color: '#FDF2F8' },
      { name: 'Art & Crafts', description: 'Fine arts, crafts, creative techniques, portfolio building', color: '#FEF7FF' }
    ]
  },
  {
    name: 'Legal & Finance',
    description: 'Legal advice and financial consulting',
    color: '#6B7280',
    icon: 'scale',
    featured: false,
    sortOrder: 7,
    subcategories: [
      { name: 'Personal Finance', description: 'Budgeting, debt management, financial planning', color: '#9CA3AF' },
      { name: 'Investment Advice', description: 'Stock market, portfolio management, retirement planning', color: '#D1D5DB' },
      { name: 'Legal Consultation', description: 'General legal advice, document review, compliance', color: '#E5E7EB' },
      { name: 'Tax Planning', description: 'Tax strategies, filing assistance, audit support', color: '#F3F4F6' },
      { name: 'Insurance', description: 'Insurance planning, policy review, risk management', color: '#F9FAFB' },
      { name: 'Real Estate', description: 'Property investment, market analysis, buying/selling', color: '#FCFCFC' }
    ]
  },
  {
    name: 'Lifestyle & Personal',
    description: 'Personal development and lifestyle consulting',
    color: '#84CC16',
    icon: 'sparkles',
    featured: false,
    sortOrder: 8,
    subcategories: [
      { name: 'Life Coaching', description: 'Goal setting, motivation, personal transformation', color: '#A3E635' },
      { name: 'Time Management', description: 'Productivity, organization, work-life balance', color: '#BEF264' },
      { name: 'Hobbies & Interests', description: 'Hobby development, skill building, leisure activities', color: '#D9F99D' },
      { name: 'Travel Planning', description: 'Trip planning, travel advice, cultural experiences', color: '#ECFCCB' },
      { name: 'Home & Garden', description: 'Interior design, gardening, home improvement', color: '#F7FEE7' },
      { name: 'Fashion & Style', description: 'Personal styling, wardrobe consulting, image advice', color: '#FDFFF7' }
    ]
  }
];

async function setupRealCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shfly_app';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Step 1: Delete all existing categories
    console.log('\n🗑️  Deleting existing categories...');
    const deletedCategories = await Category.deleteMany({});
    console.log(`✅ Deleted ${deletedCategories.deletedCount} existing categories`);

    // Step 2: Clear specializations from all users (since old categories are deleted)
    console.log('\n🔄 Clearing user specializations...');
    const usersUpdated = await User.updateMany({}, { $set: { specializations: [] } });
    console.log(`✅ Cleared specializations for ${usersUpdated.modifiedCount} users`);

    // Step 3: Create parent categories first
    console.log('\n📁 Creating parent categories...');
    const createdParentCategories = [];
    
    for (const categoryData of consultationCategories) {
      const { subcategories, ...parentData } = categoryData;
      
      const parentCategory = new Category({
        ...parentData,
        parentCategory: null, // Explicitly set as parent
        subcategories: [] // Will be populated after subcategories are created
      });
      
      await parentCategory.save();
      createdParentCategories.push(parentCategory);
      console.log(`✅ Created parent category: ${parentCategory.name}`);
    }

    // Step 4: Create subcategories
    console.log('\n📂 Creating subcategories...');
    const allCreatedCategories = [...createdParentCategories];
    
    for (let i = 0; i < consultationCategories.length; i++) {
      const parentCategory = createdParentCategories[i];
      const subcategoriesData = consultationCategories[i].subcategories;
      
      const createdSubcategories = [];
      
      for (const subcategoryData of subcategoriesData) {
        const subcategory = new Category({
          ...subcategoryData,
          parentCategory: parentCategory._id,
          subcategories: []
        });
        
        await subcategory.save();
        createdSubcategories.push(subcategory);
        allCreatedCategories.push(subcategory);
        console.log(`  ✅ Created subcategory: ${subcategory.name} (under ${parentCategory.name})`);
      }
      
      // Update parent category with subcategory references
      parentCategory.subcategories = createdSubcategories.map(sub => sub._id);
      await parentCategory.save();
    }

    // Step 5: Assign default specializations to existing users
    console.log('\n👥 Assigning default specializations to users...');
    const users = await User.find({ userType: { $ne: 'admin' } });
    const defaultCategory = allCreatedCategories.find(cat => cat.name === 'Mental Health & Psychology');
    
    if (defaultCategory) {
      for (const user of users) {
        user.specializations = [defaultCategory._id];
        await user.save();
        console.log(`✅ Assigned default specialization to ${user.email}`);
      }
    }

    // Step 6: Summary
    console.log('\n🎉 Real-world categories setup complete!');
    console.log('\n📊 Summary:');
    console.log(`- Parent categories created: ${createdParentCategories.length}`);
    console.log(`- Total subcategories created: ${allCreatedCategories.length - createdParentCategories.length}`);
    console.log(`- Total categories: ${allCreatedCategories.length}`);
    console.log(`- Users updated: ${users.length}`);
    
    console.log('\n📋 Categories created:');
    consultationCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.subcategories.length} subcategories)`);
      cat.subcategories.forEach((sub, subIndex) => {
        console.log(`   ${subIndex + 1}. ${sub.name}`);
      });
    });

    console.log('\n✨ All categories are now ready for real-world consultations!');

  } catch (error) {
    console.error('❌ Error setting up categories:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the setup
setupRealCategories();
