#!/bin/bash

# This script generates the cost-data.json file and triggers a new Vercel deployment.

# Set the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
WORKSPACE_ROOT="$PROJECT_DIR/../.."
COST_TRACKER_SCRIPT="$WORKSPACE_ROOT/skills/cost-report/scripts/cost_report.sh"
OUTPUT_FILE="$PROJECT_DIR/cost-data.json" # Moved to root
VERCEL_TOKEN="" # IMPORTANT: This token should be set as a secret in the CI/CD environment.

# Check if the cost tracker script exists
if [ ! -f "$COST_TRACKER_SCRIPT" ]; then
    echo "Error: Cost tracker script not found at $COST_TRACKER_SCRIPT"
    exit 1
fi

echo "Generating fresh cost data..."

# We will generate a report for today and yesterday.
DAILY_BREAKDOWN="[]"

# Get data for today
COST_DATA_TODAY=$($COST_TRACKER_SCRIPT --today --format json 2>/dev/null)
if echo "$COST_DATA_TODAY" | jq -e . >/dev/null 2>&1; then
    TOTAL_DAY_COST=$(echo "$COST_DATA_TODAY" | jq -r '.total')
    USERS_JSON="[
        {\"name\": \"Manish\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.5" | bc)},
        {\"name\": \"Suraj\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.3" | bc)},
        {\"name\": \"Mohit\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.2" | bc)}
    ]"
    DAY_JSON=$(jq -n \
                  --arg date "$(date +%Y-%m-%d)" \
                  --arg cost "$TOTAL_DAY_COST" \
                  --arg sessions "$(echo "$COST_DATA_TODAY" | jq -r '.models | map(.calls) | add')" \
                  --argjson users "$USERS_JSON" \
                  '{date: $date, cost: $cost | tonumber, sessions: $sessions | tonumber, users: $users}')
    DAILY_BREAKDOWN=$(echo "$DAILY_BREAKDOWN" | jq --argjson day "$DAY_JSON" '. + [$day]')
fi

# Get data for yesterday
COST_DATA_YESTERDAY=$($COST_TRACKER_SCRIPT --yesterday --format json 2>/dev/null)
if echo "$COST_DATA_YESTERDAY" | jq -e . >/dev/null 2>&1; then
    TOTAL_DAY_COST=$(echo "$COST_DATA_YESTERDAY" | jq -r '.total')
    USERS_JSON="[
        {\"name\": \"Manish\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.5" | bc)},
        {\"name\": \"Suraj\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.3" | bc)},
        {\"name\": \"MohT\", \"cost\": $(echo "$TOTAL_DAY_COST * 0.2" | bc)}
    ]"
    DAY_JSON=$(jq -n \
                  --arg date "$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)" \
                  --arg cost "$TOTAL_DAY_COST" \
                  --arg sessions "$(echo "$COST_DATA_YESTERDAY" | jq -r '.models | map(.calls) | add')" \
                  --argjson users "$USERS_JSON" \
                  '{date: $date, cost: $cost | tonumber, sessions: $sessions | tonumber, users: $users}')
    DAILY_BREAKDOWN=$(echo "$DAILY_BREAKDOWN" | jq --argjson day "$DAY_JSON" '. + [$day]')
fi


# Calculate total cost and user summaries from the collected daily data
TOTAL_COST=$(echo "$DAILY_BREAKDOWN" | jq '[.[] | .cost] | add')

# Create a dummy user summary
USER_SUMMARY="[
  {\"user\": \"Manish\", \"totalCost\": $(echo "$TOTAL_COST * 0.5" | bc), \"avgSessionCost\": 0.54},
  {\"user\": \"Suraj\", \"totalCost\": $(echo "$TOTAL_COST * 0.3" | bc), \"avgSessionCost\": 0.37},
  {\"user\": \"Mohit\", \"totalCost\": $(echo "$TOTAL_COST * 0.2" | bc), \"avgSessionCost\": 0.25}
]"


# Assemble the final JSON
FINAL_JSON=$(jq -n \
                --arg lastUpdated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                --argjson totalCost "$TOTAL_COST" \
                --argjson dailyBreakdown "$DAILY_BREAKDOWN" \
                --argjson userSummary "$USER_SUMMARY" \
                '{lastUpdated: $lastUpdated, totalCost: $totalCost, dailyBreakdown: $dailyBreakdown, userSummary: $userSummary}')

# Write the final JSON to the output file
echo "$FINAL_JSON" | jq . > "$OUTPUT_FILE"

echo "Successfully generated cost data at $OUTPUT_FILE"

echo "Triggering new Vercel deployment..."

# Change into the project directory before deploying
cd "$PROJECT_DIR" || exit

# Trigger a new deployment
npx vercel --prod --yes --token "$VERCEL_TOKEN" --scope "gensyncmolt-afks-projects"

echo "Deployment triggered."
