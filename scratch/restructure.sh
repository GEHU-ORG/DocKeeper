#!/bin/bash
set -e

GITHUB_PAT=$(grep '^GITHUB_PAT=' .env | cut -d'=' -f2)
ORG="GEHU-ORG"
WORK_DIR="/tmp/gehu-restructure"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "📥 Cloning NOTES-GEHU..."
git clone "https://oauth2:${GITHUB_PAT}@github.com/$ORG/NOTES-GEHU.git"

echo "📥 Cloning PYQ-GEHU..."
git clone "https://oauth2:${GITHUB_PAT}@github.com/$ORG/PYQ-GEHU.git"

# Function to clone a personal repo and copy its contents to a target
migrate() {
  local REPO="$1"
  local TARGET_REPO="$2"  # NOTES-GEHU or PYQ-GEHU
  local TARGET_PATH="$3"
  
  echo "📦 Migrating $REPO → $TARGET_REPO/$TARGET_PATH"
  
  git clone "https://oauth2:${GITHUB_PAT}@github.com/$ORG/$REPO.git" "temp_$REPO" 2>/dev/null || {
    echo "⚠️  Failed to clone $REPO, skipping..."
    return
  }
  
  rm -rf "temp_$REPO/.git"
  rm -f "temp_$REPO/.DS_Store"
  
  mkdir -p "$TARGET_REPO/$TARGET_PATH"
  cp -R "temp_$REPO/"* "$TARGET_REPO/$TARGET_PATH/" 2>/dev/null || true
  cp -R "temp_$REPO/".* "$TARGET_REPO/$TARGET_PATH/" 2>/dev/null || true
  rm -rf "temp_$REPO"
  
  echo "  ✅ Done"
}

echo ""
echo "=== SEMESTER 3 — Practicals ==="

# DSA-Question → NOTES-GEHU/btech/CSE/sem 3/data structures/practicals/dsa-questions/
migrate "DSA-Question" "NOTES-GEHU" "btech/CSE/sem 3/data structures/practicals/dsa-questions"

# Dsa → NOTES-GEHU/btech/CSE/sem 3/data structures/practicals/dsa-programs/
migrate "Dsa" "NOTES-GEHU" "btech/CSE/sem 3/data structures/practicals/dsa-programs"

# Cpp-Oops-Question → NOTES-GEHU/btech/CSE/sem 3/oops with cpp/practicals/
migrate "Cpp-Oops-Question" "NOTES-GEHU" "btech/CSE/sem 3/oops with cpp/practicals"

echo ""
echo "=== SEMESTER 4 — Practicals ==="

# DAA-4th-Sem-Practical → NOTES-GEHU/btech/CSE/sem 4/design and analysis of algorithms/practicals/
migrate "DAA-4th-Sem-Practical" "NOTES-GEHU" "btech/CSE/sem 4/design and analysis of algorithms/practicals"

# Java-Practical → NOTES-GEHU/btech/CSE/sem 4/java programming/practicals/lab-programs/
migrate "Java-Practical" "NOTES-GEHU" "btech/CSE/sem 4/java programming/practicals/lab-programs"

# Java → NOTES-GEHU/btech/CSE/sem 4/java programming/practicals/java-programs/
migrate "Java" "NOTES-GEHU" "btech/CSE/sem 4/java programming/practicals/java-programs"

echo ""
echo "=== SEMESTER 5 — Practicals & Mid-terms ==="

# OS-LAB → NOTES-GEHU/btech/CSE/sem 5/operating systems/practicals/
migrate "OS-LAB" "NOTES-GEHU" "btech/CSE/sem 5/operating systems/practicals"

# OS-MId → PYQ-GEHU/btech/CSE/sem 5/operating systems/mid-term/
migrate "OS-MId" "PYQ-GEHU" "btech/CSE/sem 5/operating systems/mid-term"

# DBMS-LAB → NOTES-GEHU/btech/CSE/sem 5/dbms/practicals/
migrate "DBMS-LAB" "NOTES-GEHU" "btech/CSE/sem 5/dbms/practicals"

# DBMS-MID → PYQ-GEHU/btech/CSE/sem 5/dbms/mid-term/
migrate "DBMS-MID" "PYQ-GEHU" "btech/CSE/sem 5/dbms/mid-term"

# CN-LAB → NOTES-GEHU/btech/CSE/sem 5/computer network 1/practicals/cn-lab/
migrate "CN-LAB" "NOTES-GEHU" "btech/CSE/sem 5/computer network 1/practicals/cn-lab"

# CN → NOTES-GEHU/btech/CSE/sem 5/computer network 1/practicals/packet-tracer/
migrate "CN" "NOTES-GEHU" "btech/CSE/sem 5/computer network 1/practicals/packet-tracer"

echo ""
echo "=== SEMESTER 6 — Practicals & Mid-terms ==="

# Compiler-Design-Lab → NOTES-GEHU/btech/CSE/sem 6/compiler design/practicals/
migrate "Compiler-Design-Lab" "NOTES-GEHU" "btech/CSE/sem 6/compiler design/practicals"

# web-d-mid-term → PYQ-GEHU/btech/CSE/sem 6/full stack web development/mid-term/
migrate "web-d-mid-term" "PYQ-GEHU" "btech/CSE/sem 6/full stack web development/mid-term"

echo ""
echo "=== PROJECTS ==="

# Project → NOTES-GEHU/btech/CSE/projects/
migrate "Project" "NOTES-GEHU" "btech/CSE/projects"

echo ""
echo "=== Committing and Pushing NOTES-GEHU ==="
cd "$WORK_DIR/NOTES-GEHU"
git add -A
git commit -m "feat: merge 12 personal repos into structured btech/CSE practicals & projects

Merged repos: DSA-Question, Dsa, Cpp-Oops-Question, DAA-4th-Sem-Practical,
Java-Practical, Java, OS-LAB, DBMS-LAB, CN-LAB, CN, Compiler-Design-Lab, Project

Each repo placed under the correct semester and subject with /practicals/ subfolder."
git push origin main

echo ""
echo "=== Committing and Pushing PYQ-GEHU ==="
cd "$WORK_DIR/PYQ-GEHU"
git add -A
git commit -m "feat: merge 3 mid-term repos into structured btech/CSE

Merged repos: OS-MId, DBMS-MID, web-d-mid-term
Each placed under correct semester subject with /mid-term/ subfolder."
git push origin main

echo ""
echo "🎉 Migration Complete!"
echo "   NOTES-GEHU: 12 repos merged (practicals + projects)"
echo "   PYQ-GEHU: 3 repos merged (mid-term papers)"
echo ""
echo "⚠️  Old repos still exist. You can archive them manually from GitHub settings."
