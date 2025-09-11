# Journal and Wellness Integration Examples

This document provides comprehensive examples for implementing journal and wellness tracking workflows with the Astral Core v7 API.

## Table of Contents

1. [Journal Management](#journal-management)
2. [Wellness Data Integration](#wellness-data-integration)
3. [Mood Tracking and Analysis](#mood-tracking-and-analysis)
4. [Combined Workflows](#combined-workflows)

## Journal Management

### Creating Journal Entries

```javascript
// Create a new journal entry
const createJournalEntry = async (entryData) => {
  try {
    const response = await fetch('/api/journal/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(entryData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Journal entry created:', result.data);
      return {
        success: true,
        entry: result.data
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to create journal entry:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Example: Daily reflection entry
const createDailyReflection = async (mood, content, tags = []) => {
  const entryData = {
    title: `Daily Reflection - ${new Date().toLocaleDateString()}`,
    content: content,
    mood: mood, // 1-10 scale
    tags: ['daily-reflection', ...tags],
    isPrivate: true
  };

  return await createJournalEntry(entryData);
};

// Usage example
createDailyReflection(
  7,
  "Today was a good day. I managed to complete my breathing exercises and felt less anxious during the work meeting. The techniques I learned in therapy are really helping.",
  ['anxiety', 'breathing-exercises', 'work']
).then(result => {
  if (result.success) {
    console.log('Daily reflection saved');
  }
});
```

### Retrieving and Filtering Journal Entries

```javascript
// Get journal entries with filtering
const getJournalEntries = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.mood) params.append('mood', filters.mood);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await fetch(`/api/journal/entries?${params}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        entries: result.data.items,
        total: result.data.total,
        hasMore: result.data.hasMore
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to fetch journal entries:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get entries from the last week
const getLastWeekEntries = async () => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return await getJournalEntries({
    startDate,
    endDate,
    limit: 50
  });
};

// Get entries by mood range (feeling good: 7-10)
const getPositiveMoodEntries = async () => {
  const entries = [];
  
  // API doesn't support mood range, so we'll filter client-side
  for (let mood = 7; mood <= 10; mood++) {
    const result = await getJournalEntries({ mood, limit: 100 });
    if (result.success) {
      entries.push(...result.entries);
    }
  }
  
  return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
```

## Wellness Data Integration

### Logging Comprehensive Wellness Data

```javascript
// Log wellness data with journal integration
const logWellnessDataWithJournal = async (wellnessData, journalContent = null) => {
  try {
    // First, log wellness data
    const wellnessResponse = await fetch('/api/wellness/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(wellnessData)
    });

    const wellnessResult = await wellnessResponse.json();

    if (!wellnessResponse.ok) {
      throw new Error(wellnessResult.error);
    }

    // If journal content provided, create journal entry
    let journalEntry = null;
    if (journalContent) {
      const journalData = {
        title: `Wellness Log - ${wellnessData.date || new Date().toLocaleDateString()}`,
        content: journalContent,
        mood: wellnessData.moodScore,
        tags: ['wellness-log', 'mood-tracking'],
        isPrivate: true
      };

      const journalResult = await createJournalEntry(journalData);
      if (journalResult.success) {
        journalEntry = journalResult.entry;
      }
    }

    return {
      success: true,
      wellnessData: wellnessResult.data,
      journalEntry: journalEntry
    };

  } catch (error) {
    console.error('Failed to log wellness data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Example: Morning check-in with reflection
const morningCheckIn = async () => {
  const wellnessData = {
    date: new Date().toISOString().split('T')[0],
    moodScore: 6,
    anxietyLevel: 4,
    stressLevel: 5,
    sleepHours: 7.5,
    sleepQuality: 7,
    exercise: false,
    meditation: true,
    meditationMinutes: 10,
    socialContact: false,
    medications: ['sertraline_50mg'],
    symptoms: ['mild_anxiety'],
    copingStrategies: ['meditation'],
    notes: "Slept well but feeling a bit anxious about today's presentation"
  };

  const journalContent = `
Morning reflection: I slept well last night, which is great! I did my 10-minute meditation this morning and it helped center me. 

I'm feeling a bit anxious about the presentation today, but I'm going to use the breathing techniques I learned. I'll also remind myself that I'm well-prepared and that some nervousness is normal.

Goals for today:
- Use deep breathing before the presentation
- Take breaks if feeling overwhelmed
- Celebrate small wins
`;

  return await logWellnessDataWithJournal(wellnessData, journalContent);
};
```

### Evening Reflection and Data Analysis

```javascript
// Evening reflection with daily summary
const eveningReflection = async () => {
  const wellnessData = {
    moodScore: 8,
    anxietyLevel: 2,
    stressLevel: 3,
    exercise: true,
    exerciseMinutes: 30,
    socialContact: true,
    copingStrategies: ['deep_breathing', 'exercise', 'positive_self_talk'],
    notes: "Great day! Presentation went well, exercised after work, and had dinner with friends."
  };

  const journalContent = `
Evening reflection: What a turnaround from this morning! 

The presentation went really well. I used the breathing techniques before starting and felt much more confident. My colleagues gave positive feedback, which boosted my mood significantly.

After work, I went for a 30-minute walk which helped me decompress. Then I had dinner with Sarah and Mike, which was exactly what I needed for social connection.

Key insights:
- The breathing techniques really work when I remember to use them
- Exercise after work helps me transition out of work mode
- Social connections are crucial for my mental health

Gratitude:
- Supportive colleagues
- Good friends who make time for dinner
- My body's ability to exercise and move

Tomorrow's intention: Continue using coping strategies that worked today
`;

  return await logWellnessDataWithJournal(wellnessData, journalContent);
};
```

## Mood Tracking and Analysis

### Mood Pattern Analysis

```javascript
// Analyze mood patterns over time
const analyzeMoodPatterns = async (timeframe = 30) => {
  try {
    // Get wellness data for the timeframe
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const wellnessResponse = await fetch(`/api/wellness/data?startDate=${startDate}&endDate=${endDate}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const wellnessResult = await wellnessResponse.json();

    if (!wellnessResponse.ok) {
      throw new Error(wellnessResult.error);
    }

    // Get journal entries for the same period
    const journalEntries = await getJournalEntries({
      startDate,
      endDate,
      limit: 100
    });

    // Analyze patterns
    const analysis = {
      averageMood: 0,
      moodTrend: 'stable',
      bestDays: [],
      challengingDays: [],
      correlations: {
        sleepAndMood: 0,
        exerciseAndMood: 0,
        socialAndMood: 0
      },
      insights: []
    };

    const wellnessData = wellnessResult.data.items;
    
    if (wellnessData.length === 0) {
      return { success: true, analysis: { ...analysis, insights: ['Not enough data for analysis'] } };
    }

    // Calculate average mood
    analysis.averageMood = wellnessData.reduce((sum, day) => sum + day.moodScore, 0) / wellnessData.length;

    // Find best and challenging days
    const sortedByMood = [...wellnessData].sort((a, b) => b.moodScore - a.moodScore);
    analysis.bestDays = sortedByMood.slice(0, 3).map(day => ({
      date: day.date,
      mood: day.moodScore,
      notes: day.notes
    }));
    analysis.challengingDays = sortedByMood.slice(-3).map(day => ({
      date: day.date,
      mood: day.moodScore,
      notes: day.notes
    }));

    // Calculate correlations
    const sleepMoodCorr = calculateCorrelation(
      wellnessData.map(d => d.sleepHours || 7),
      wellnessData.map(d => d.moodScore)
    );
    analysis.correlations.sleepAndMood = sleepMoodCorr;

    const exerciseMoodCorr = calculateCorrelation(
      wellnessData.map(d => d.exercise ? d.exerciseMinutes || 30 : 0),
      wellnessData.map(d => d.moodScore)
    );
    analysis.correlations.exerciseAndMood = exerciseMoodCorr;

    const socialMoodCorr = calculateCorrelation(
      wellnessData.map(d => d.socialContact ? 1 : 0),
      wellnessData.map(d => d.moodScore)
    );
    analysis.correlations.socialAndMood = socialMoodCorr;

    // Generate insights
    analysis.insights = generateMoodInsights(analysis, wellnessData, journalEntries.success ? journalEntries.entries : []);

    return {
      success: true,
      analysis
    };

  } catch (error) {
    console.error('Failed to analyze mood patterns:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to calculate correlation
const calculateCorrelation = (x, y) => {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

// Generate insights based on analysis
const generateMoodInsights = (analysis, wellnessData, journalEntries) => {
  const insights = [];

  // Sleep correlation insights
  if (analysis.correlations.sleepAndMood > 0.3) {
    insights.push("Your mood appears to be positively correlated with sleep quality. Consider maintaining consistent sleep habits.");
  } else if (analysis.correlations.sleepAndMood < -0.3) {
    insights.push("There may be a negative correlation between your tracked sleep and mood. Consider reviewing your sleep tracking or sleep environment.");
  }

  // Exercise correlation insights
  if (analysis.correlations.exerciseAndMood > 0.3) {
    insights.push("Exercise appears to have a positive impact on your mood. Try to maintain regular physical activity.");
  }

  // Social correlation insights
  if (analysis.correlations.socialAndMood > 0.3) {
    insights.push("Social contact seems to boost your mood. Consider scheduling regular social activities.");
  }

  // Average mood insights
  if (analysis.averageMood >= 7) {
    insights.push("Your overall mood has been quite positive! Keep up the practices that are working for you.");
  } else if (analysis.averageMood <= 4) {
    insights.push("Your mood has been lower recently. Consider reaching out to your support network or healthcare provider.");
  }

  // Journal-based insights
  if (journalEntries.length > 0) {
    const commonTags = getCommonTags(journalEntries);
    if (commonTags.length > 0) {
      insights.push(`Common themes in your journal: ${commonTags.join(', ')}. Consider discussing these patterns with your therapist.`);
    }
  }

  return insights;
};

// Helper function to get common tags from journal entries
const getCommonTags = (entries) => {
  const tagCounts = {};
  
  entries.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return Object.entries(tagCounts)
    .filter(([tag, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
};
```

## Combined Workflows

### Weekly Wellness Report

```javascript
// Generate comprehensive weekly wellness report
const generateWeeklyReport = async () => {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get wellness data
    const wellnessResponse = await fetch(`/api/wellness/data?startDate=${startDate}&endDate=${endDate}&limit=50`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const wellnessResult = await wellnessResponse.json();

    // Get journal entries
    const journalResult = await getJournalEntries({
      startDate,
      endDate,
      limit: 50
    });

    // Analyze mood patterns
    const moodAnalysis = await analyzeMoodPatterns(7);

    if (!wellnessResponse.ok) {
      throw new Error(wellnessResult.error);
    }

    const report = {
      period: { startDate, endDate },
      summary: {
        daysTracked: wellnessResult.data.items.length,
        journalEntries: journalResult.success ? journalResult.entries.length : 0,
        averageMood: 0,
        averageAnxiety: 0,
        averageStress: 0
      },
      habits: {
        exerciseDays: 0,
        meditationDays: 0,
        socialContactDays: 0,
        averageSleepHours: 0
      },
      insights: [],
      recommendations: []
    };

    const wellnessData = wellnessResult.data.items;

    if (wellnessData.length > 0) {
      // Calculate averages
      report.summary.averageMood = Math.round(
        wellnessData.reduce((sum, day) => sum + day.moodScore, 0) / wellnessData.length * 10
      ) / 10;

      report.summary.averageAnxiety = Math.round(
        wellnessData.reduce((sum, day) => sum + day.anxietyLevel, 0) / wellnessData.length * 10
      ) / 10;

      report.summary.averageStress = Math.round(
        wellnessData.reduce((sum, day) => sum + day.stressLevel, 0) / wellnessData.length * 10
      ) / 10;

      // Calculate habits
      report.habits.exerciseDays = wellnessData.filter(day => day.exercise).length;
      report.habits.meditationDays = wellnessData.filter(day => day.meditation).length;
      report.habits.socialContactDays = wellnessData.filter(day => day.socialContact).length;
      
      const sleepData = wellnessData.filter(day => day.sleepHours);
      report.habits.averageSleepHours = sleepData.length > 0 ? 
        Math.round(sleepData.reduce((sum, day) => sum + day.sleepHours, 0) / sleepData.length * 10) / 10 : 0;

      // Generate insights and recommendations
      report.insights = generateWeeklyInsights(report, wellnessData);
      report.recommendations = generateWeeklyRecommendations(report, wellnessData);
    }

    // Add mood analysis insights
    if (moodAnalysis.success) {
      report.insights.push(...moodAnalysis.analysis.insights);
    }

    return {
      success: true,
      report
    };

  } catch (error) {
    console.error('Failed to generate weekly report:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate insights for weekly report
const generateWeeklyInsights = (report, wellnessData) => {
  const insights = [];

  // Mood insights
  if (report.summary.averageMood >= 7) {
    insights.push("✨ Your mood has been consistently positive this week!");
  } else if (report.summary.averageMood <= 4) {
    insights.push("💙 Your mood has been lower this week. Remember that it's okay to have difficult periods.");
  }

  // Exercise insights
  const exerciseRate = (report.habits.exerciseDays / report.summary.daysTracked) * 100;
  if (exerciseRate >= 70) {
    insights.push("🏃‍♀️ Great job staying active this week!");
  } else if (exerciseRate < 30) {
    insights.push("🚶‍♀️ Consider adding more physical activity to your routine.");
  }

  // Sleep insights
  if (report.habits.averageSleepHours >= 7 && report.habits.averageSleepHours <= 9) {
    insights.push("😴 Your sleep schedule looks healthy this week.");
  } else if (report.habits.averageSleepHours < 6) {
    insights.push("⏰ You may benefit from prioritizing more sleep.");
  }

  // Anxiety/stress insights
  if (report.summary.averageAnxiety > 7 || report.summary.averageStress > 7) {
    insights.push("🧘‍♀️ Consider incorporating more stress-reduction techniques into your routine.");
  }

  return insights;
};

// Generate recommendations for weekly report
const generateWeeklyRecommendations = (report, wellnessData) => {
  const recommendations = [];

  // Based on exercise habits
  if (report.habits.exerciseDays < 3) {
    recommendations.push("Try to aim for at least 3 days of physical activity this week");
  }

  // Based on meditation
  if (report.habits.meditationDays < 4) {
    recommendations.push("Consider incorporating mindfulness or meditation into your daily routine");
  }

  // Based on social contact
  if (report.habits.socialContactDays < 2) {
    recommendations.push("Schedule some social activities or check-ins with friends/family");
  }

  // Based on mood patterns
  if (report.summary.averageMood < 6) {
    recommendations.push("Consider discussing your mood patterns with your therapist or healthcare provider");
  }

  // Based on stress/anxiety
  if (report.summary.averageStress > 6 || report.summary.averageAnxiety > 6) {
    recommendations.push("Practice stress-reduction techniques like deep breathing or progressive muscle relaxation");
  }

  return recommendations;
};

// Display formatted weekly report
const displayWeeklyReport = async () => {
  const result = await generateWeeklyReport();
  
  if (result.success) {
    const report = result.report;
    
    console.log(`
📊 WEEKLY WELLNESS REPORT
Period: ${report.period.startDate} to ${report.period.endDate}

📈 SUMMARY
• Days tracked: ${report.summary.daysTracked}/7
• Journal entries: ${report.summary.journalEntries}
• Average mood: ${report.summary.averageMood}/10
• Average anxiety: ${report.summary.averageAnxiety}/10
• Average stress: ${report.summary.averageStress}/10

🏃‍♀️ HABITS
• Exercise: ${report.habits.exerciseDays} days
• Meditation: ${report.habits.meditationDays} days
• Social contact: ${report.habits.socialContactDays} days
• Average sleep: ${report.habits.averageSleepHours} hours

💡 INSIGHTS
${report.insights.map(insight => `• ${insight}`).join('\n')}

🎯 RECOMMENDATIONS
${report.recommendations.map(rec => `• ${rec}`).join('\n')}
    `);
  }
};
```

This comprehensive documentation provides practical examples for integrating journal and wellness tracking features, enabling users to gain deeper insights into their mental health patterns and progress.