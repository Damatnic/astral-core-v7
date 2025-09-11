# Treatment Plan Workflow Examples

This document provides comprehensive examples for implementing treatment plan workflows with the Astral Core v7 API.

## Table of Contents

1. [Creating Treatment Plans](#creating-treatment-plans)
2. [Progress Tracking](#progress-tracking)
3. [Template Usage](#template-usage)
4. [Client and Therapist Views](#client-and-therapist-views)

## Creating Treatment Plans

### Therapist Creates Treatment Plan

```javascript
// Create a new treatment plan for a client
const createTreatmentPlan = async (clientId, planData) => {
  try {
    const response = await fetch('/api/treatment-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${therapistToken}`
      },
      body: JSON.stringify({
        clientId,
        title: planData.title,
        description: planData.description,
        goals: planData.goals
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Treatment plan created:', result.data);
      return {
        success: true,
        plan: result.data
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to create treatment plan:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Example usage
const newPlan = {
  title: "Anxiety Management Plan",
  description: "Comprehensive treatment plan for managing anxiety symptoms using CBT techniques",
  goals: [
    {
      title: "Reduce Anxiety Symptoms",
      description: "Decrease anxiety symptoms by 50% within 8 weeks",
      targetDate: "2024-03-15",
      objectives: [
        { description: "Learn deep breathing techniques" },
        { description: "Practice progressive muscle relaxation daily" },
        { description: "Identify and challenge negative thought patterns" }
      ]
    },
    {
      title: "Improve Sleep Quality",
      description: "Establish healthy sleep hygiene and improve sleep quality",
      targetDate: "2024-02-15",
      objectives: [
        { description: "Maintain consistent bedtime routine" },
        { description: "Limit screen time before bed" },
        { description: "Practice relaxation techniques before sleep" }
      ]
    }
  ]
};

createTreatmentPlan('client-123', newPlan).then(result => {
  if (result.success) {
    console.log('Plan ID:', result.plan.id);
    // Navigate to plan details or update UI
  } else {
    showErrorMessage(result.error);
  }
});
```

### Using Treatment Plan Templates

```javascript
// Get available templates and create plan from template
const createPlanFromTemplate = async (clientId, templateId) => {
  try {
    // First, get the template
    const templateResponse = await fetch('/api/treatment-plans/templates', {
      headers: {
        'Authorization': `Bearer ${therapistToken}`
      }
    });

    const templates = await templateResponse.json();
    const template = templates.templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Create plan based on template
    const planData = {
      title: `${template.name} - Customized Plan`,
      description: template.description,
      goals: template.goals.map(goal => ({
        title: goal.title,
        description: goal.description,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
        objectives: goal.objectives
      }))
    };

    return await createTreatmentPlan(clientId, planData);
  } catch (error) {
    console.error('Failed to create plan from template:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all templates first
const getTemplates = async () => {
  try {
    const response = await fetch('/api/treatment-plans/templates', {
      headers: {
        'Authorization': `Bearer ${therapistToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      return result.templates;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to fetch templates:', error.message);
    return [];
  }
};
```

## Progress Tracking

### Update Progress on Goals and Objectives

```javascript
// Update progress on a specific objective
const updateProgress = async (planId, goalId, objectiveId, progressData) => {
  try {
    const response = await fetch('/api/treatment-plans/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        planId,
        goalId,
        objectiveId,
        progress: progressData.progress,
        notes: progressData.notes,
        evidenceData: progressData.evidenceData
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Progress updated:', result.data);
      return {
        success: true,
        update: result.data
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to update progress:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Example: Client updates progress on breathing exercise objective
const updateBreathingProgress = async () => {
  const progressData = {
    progress: 75, // 75% complete
    notes: "Practiced deep breathing for 10 minutes daily this week. Feeling more calm during anxiety episodes.",
    evidenceData: {
      sessionsThisWeek: 7,
      averageDuration: 10,
      anxietyReductionRating: 7,
      selfReportedImprovement: "Significant"
    }
  };

  return await updateProgress(
    'plan-123',
    'goal-456',
    'objective-789',
    progressData
  );
};

// Example: Therapist updates overall goal progress
const updateGoalProgress = async () => {
  const progressData = {
    progress: 60, // 60% complete
    notes: "Client showing excellent progress with CBT techniques. Sleep quality has improved significantly.",
    evidenceData: {
      sessionsCompleted: 6,
      homeworkCompliance: 90,
      symptomReduction: 45,
      sleepQualityImprovement: 70
    }
  };

  return await updateProgress(
    'plan-123',
    'goal-456',
    null, // No specific objective, updating entire goal
    progressData
  );
};
```

### Track Progress Over Time

```javascript
// Get treatment plan with current progress
const getTreatmentPlanProgress = async (planId) => {
  try {
    const response = await fetch(`/api/treatment-plans?planId=${planId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      const plan = result.data.find(p => p.id === planId);
      return {
        success: true,
        plan: plan
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to fetch treatment plan:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Calculate overall plan completion percentage
const calculatePlanCompletion = (plan) => {
  if (!plan.goals || plan.goals.length === 0) return 0;

  const totalObjectives = plan.goals.reduce((total, goal) => 
    total + (goal.objectives ? goal.objectives.length : 0), 0
  );

  if (totalObjectives === 0) return 0;

  const completedObjectives = plan.goals.reduce((total, goal) => 
    total + (goal.objectives ? goal.objectives.filter(obj => obj.isCompleted).length : 0), 0
  );

  return Math.round((completedObjectives / totalObjectives) * 100);
};

// Display progress dashboard
const displayProgressDashboard = async (planId) => {
  const result = await getTreatmentPlanProgress(planId);
  
  if (result.success) {
    const plan = result.plan;
    const overallCompletion = calculatePlanCompletion(plan);
    
    console.log(`Treatment Plan: ${plan.title}`);
    console.log(`Overall Completion: ${overallCompletion}%`);
    console.log(`Status: ${plan.status}`);
    
    plan.goals.forEach((goal, index) => {
      const goalCompletion = goal.objectives ? 
        Math.round((goal.objectives.filter(obj => obj.isCompleted).length / goal.objectives.length) * 100) : 0;
      
      console.log(`\nGoal ${index + 1}: ${goal.title}`);
      console.log(`  Completion: ${goalCompletion}%`);
      console.log(`  Target Date: ${goal.targetDate}`);
      
      if (goal.objectives) {
        goal.objectives.forEach((objective, objIndex) => {
          console.log(`    ${objIndex + 1}. ${objective.description} ${objective.isCompleted ? '✓' : '○'}`);
        });
      }
    });
  }
};
```

## Client and Therapist Views

### Client View - My Treatment Plans

```javascript
// Client fetches their treatment plans
const getMyTreatmentPlans = async () => {
  try {
    const response = await fetch('/api/treatment-plans', {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        plans: result.data
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to fetch treatment plans:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Display client dashboard
const displayClientDashboard = async () => {
  const result = await getMyTreatmentPlans();
  
  if (result.success) {
    console.log("My Treatment Plans:");
    
    result.plans.forEach(plan => {
      const completion = calculatePlanCompletion(plan);
      console.log(`\n📋 ${plan.title}`);
      console.log(`   Progress: ${completion}%`);
      console.log(`   Status: ${plan.status}`);
      console.log(`   Created: ${new Date(plan.createdAt).toLocaleDateString()}`);
      
      // Show next objectives to work on
      const nextObjectives = [];
      plan.goals.forEach(goal => {
        if (goal.objectives) {
          const incompleteObjectives = goal.objectives.filter(obj => !obj.isCompleted);
          if (incompleteObjectives.length > 0) {
            nextObjectives.push({
              goalTitle: goal.title,
              objective: incompleteObjectives[0].description
            });
          }
        }
      });
      
      if (nextObjectives.length > 0) {
        console.log("   Next steps:");
        nextObjectives.slice(0, 3).forEach(next => {
          console.log(`   • ${next.objective} (${next.goalTitle})`);
        });
      }
    });
  }
};
```

### Therapist View - Client Management

```javascript
// Therapist fetches treatment plans for specific client
const getClientTreatmentPlans = async (clientId) => {
  try {
    const response = await fetch(`/api/treatment-plans?clientId=${clientId}`, {
      headers: {
        'Authorization': `Bearer ${therapistToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        plans: result.data
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to fetch client treatment plans:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Display therapist client overview
const displayTherapistClientView = async (clientId) => {
  const result = await getClientTreatmentPlans(clientId);
  
  if (result.success) {
    console.log(`Treatment Plans for Client ${clientId}:`);
    
    result.plans.forEach(plan => {
      const completion = calculatePlanCompletion(plan);
      console.log(`\n📋 ${plan.title}`);
      console.log(`   Progress: ${completion}%`);
      console.log(`   Status: ${plan.status}`);
      
      // Calculate goals needing attention
      const goalsNeedingAttention = plan.goals.filter(goal => {
        const targetDate = new Date(goal.targetDate);
        const now = new Date();
        const daysUntilTarget = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        
        const goalCompletion = goal.objectives ? 
          (goal.objectives.filter(obj => obj.isCompleted).length / goal.objectives.length) * 100 : 0;
        
        // Goal needs attention if it's less than 50% complete and within 2 weeks of target
        return goalCompletion < 50 && daysUntilTarget <= 14 && daysUntilTarget > 0;
      });
      
      if (goalsNeedingAttention.length > 0) {
        console.log("   ⚠️  Goals needing attention:");
        goalsNeedingAttention.forEach(goal => {
          console.log(`     • ${goal.title} (Due: ${goal.targetDate})`);
        });
      }
    });
  }
};
```

## Advanced Workflows

### Automated Progress Reminders

```javascript
// Check for overdue objectives and send reminders
const checkAndSendReminders = async (clientId) => {
  const plans = await getClientTreatmentPlans(clientId);
  
  if (plans.success) {
    const overdueItems = [];
    
    plans.plans.forEach(plan => {
      plan.goals.forEach(goal => {
        const targetDate = new Date(goal.targetDate);
        const now = new Date();
        
        if (targetDate < now && goal.objectives) {
          const incompleteObjectives = goal.objectives.filter(obj => !obj.isCompleted);
          
          incompleteObjectives.forEach(objective => {
            overdueItems.push({
              planTitle: plan.title,
              goalTitle: goal.title,
              objective: objective.description,
              daysOverdue: Math.ceil((now - targetDate) / (1000 * 60 * 60 * 24))
            });
          });
        }
      });
    });
    
    if (overdueItems.length > 0) {
      // Send notification or create reminder
      console.log("Overdue items found:");
      overdueItems.forEach(item => {
        console.log(`• ${item.objective} (${item.daysOverdue} days overdue)`);
      });
      
      // In a real application, this would trigger notifications
      return {
        hasOverdue: true,
        overdueItems
      };
    }
  }
  
  return {
    hasOverdue: false,
    overdueItems: []
  };
};
```

This comprehensive treatment plan workflow documentation provides therapists and developers with practical examples for implementing the full treatment planning lifecycle in the Astral Core v7 platform.