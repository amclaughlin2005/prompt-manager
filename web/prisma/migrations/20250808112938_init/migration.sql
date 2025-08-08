-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptVersionId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "inputVars" JSONB NOT NULL,
    "output" JSONB,
    "toolCalls" JSONB,
    "usage" JSONB,
    "costUsd" REAL,
    "latencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Run_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvalDataset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvalExample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetId" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "expected" JSONB,
    "metadata" JSONB,
    CONSTRAINT "EvalExample_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "EvalDataset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetId" TEXT NOT NULL,
    "matrixConfig" JSONB NOT NULL,
    "judgeConfig" JSONB NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "summary" JSONB,
    CONSTRAINT "EvalRun_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "EvalDataset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvalResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evalRunId" TEXT NOT NULL,
    "exampleId" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "output" JSONB,
    "scores" JSONB,
    "costUsd" REAL,
    "latencyMs" INTEGER,
    CONSTRAINT "EvalResult_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "EvalRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvalResult_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "EvalExample" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvalResult_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");
