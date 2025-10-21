#!/bin/bash

# Run all allergy system tests
# Usage: ./run-allergy-tests.sh

echo "🧪 Starting Unified Allergy System Tests"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to backend directory
echo "${BLUE}📂 Navigating to backend directory...${NC}"
cd "$(dirname "$0")/../backend" || exit 1
echo ""

# Function to run tests and capture results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "${BLUE}🔬 Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    if npm run test:backend "$test_file" 2>&1 | tee /tmp/test_output.log; then
        # Check if tests actually passed by looking for failure indicators
        if grep -q "FAIL\|failed" /tmp/test_output.log; then
            echo "${RED}❌ FAILED: ${test_name}${NC}"
            echo ""
            return 1
        else
            echo "${GREEN}✅ PASSED: ${test_name}${NC}"
            echo ""
            return 0
        fi
    else
        echo "${RED}❌ ERROR: ${test_name}${NC}"
        echo ""
        return 1
    fi
}

# Track test results
total_tests=0
passed_tests=0
failed_tests=0

# Test 1: ClientFace API Tests
total_tests=$((total_tests + 1))
if run_test "tests/clientFace.test.js" "ClientFace API Tests"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Test 2: Allergy Integration Tests
total_tests=$((total_tests + 1))
if run_test "tests/allergyIntegration.test.js" "Allergy Integration Tests"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Print summary
echo ""
echo "========================================"
echo "📊 TEST SUMMARY"
echo "========================================"
echo ""
echo "Total Test Suites: $total_tests"
echo "${GREEN}Passed: $passed_tests${NC}"
if [ $failed_tests -gt 0 ]; then
    echo "${RED}Failed: $failed_tests${NC}"
fi
echo ""

# Final status
if [ $failed_tests -eq 0 ]; then
    echo "${GREEN}🎉 All tests passed! Ready for production.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run manual testing checklist"
    echo "2. Test in browser (Section 1 and Section 5)"
    echo "3. Verify cross-section data flow"
    echo ""
    exit 0
else
    echo "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
    echo ""
    echo "Debugging tips:"
    echo "1. Check if backend route is updated (clientFace.js)"
    echo "2. Verify database tables are correct"
    echo "3. Look for error messages in test output"
    echo "4. Run tests individually for more detail"
    echo ""
    exit 1
fi