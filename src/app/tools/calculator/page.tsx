"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Mode = "deg" | "rad";

export default function ScientificCalculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [memory, setMemory] = useState(0);
  const [mode, setMode] = useState<Mode>("deg");
  const [isSecond, setIsSecond] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const evaluate = () => {
    try {
      let expr = display;

      // Auto-close parentheses
      const openCount = (expr.match(/\(/g) || []).length;
      const closeCount = (expr.match(/\)/g) || []).length;
      for (let i = 0; i < openCount - closeCount; i++) expr += ")";

      // Handle factorials: find patterns like (expr)! or number!
      expr = expr.replace(/([^a-zA-Z0-9_\s]*[\d.]+|[^a-zA-Z0-9_\s]*\([^)]*\))!/g, (_match, base) => {
        return `__FACT(${base})`;
      });

      // Replace display symbols with JS operators
      expr = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .replace(/π/g, "(Math.PI)")
        .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, "(Math.E)");

      // Wrap trig functions to handle DEG/RAD
      const degWrap = (fn: string, arg: string) => {
        if (mode === "deg") return `Math.${fn}((${arg}) * Math.PI / 180)`;
        return `Math.${fn}(${arg})`;
      };
      const radWrap = (fn: string, arg: string) => {
        if (mode === "deg") return `Math.${fn}(${arg}) * 180 / Math.PI`;
        return `Math.${fn}(${arg})`;
      };

      // Replace functions with proper wrappers
      // Process from innermost to handle nested calls
      let maxIter = 50;
      while ((expr.includes("sin(") || expr.includes("cos(") || expr.includes("tan(") ||
              expr.includes("asin(") || expr.includes("acos(") || expr.includes("atan(") ||
              expr.includes("log(") || expr.includes("ln(") || expr.includes("sqrt(") ||
              expr.includes("abs(")) && maxIter > 0) {
        maxIter--;
        expr = expr
          .replace(/asin\(([^()]*)\)/g, (_, a) => `(${radWrap("asin", a)})`)
          .replace(/acos\(([^()]*)\)/g, (_, a) => `(${radWrap("acos", a)})`)
          .replace(/atan\(([^()]*)\)/g, (_, a) => `(${radWrap("atan", a)})`)
          .replace(/sin\(([^()]*)\)/g, (_, a) => `(${degWrap("sin", a)})`)
          .replace(/cos\(([^()]*)\)/g, (_, a) => `(${degWrap("cos", a)})`)
          .replace(/tan\(([^()]*)\)/g, (_, a) => `(${degWrap("tan", a)})`)
          .replace(/log\(([^()]*)\)/g, (_, a) => `(Math.log10(${a}))`)
          .replace(/ln\(([^()]*)\)/g, (_, a) => `(Math.log(${a}))`)
          .replace(/sqrt\(([^()]*)\)/g, (_, a) => `(Math.sqrt(${a}))`)
          .replace(/abs\(([^()]*)\)/g, (_, a) => `(Math.abs(${a}))`);
      }

      // Replace __FACT with actual factorial calls
      expr = expr.replace(/__FACT\(([^)]+)\)/g, "factorial($1)");

      // Create safe evaluation context
      const result = new Function("factorial", `"use strict"; return (${expr})`)(factorial);
      const formatted = Number.isFinite(result) ? parseFloat(result.toPrecision(12)).toString() : "Error";
      setHistory((prev) => [`${display} = ${formatted}`, ...prev].slice(0, 10));
      setExpression(display);
      setDisplay(formatted);
    } catch {
      setDisplay("Error");
    }
  };

  const appendChar = (char: string) => {
    setDisplay((prev) => {
      if (prev === "Error") return char;
      if (prev === "0" && ![".", "×", "÷", "^", "!", ")"].includes(char)) return char;
      return prev + char;
    });
  };

  const handleNumber = (num: string) => {
    if (num === ".") {
      const parts = display.split(/[+\-×÷^]/);
      const last = parts[parts.length - 1];
      if (last.includes(".")) return;
    }
    appendChar(num);
  };

  const handleOperator = (op: string) => {
    const lastChar = display.slice(-1);
    if (["+", "-", "×", "÷", "^"].includes(lastChar)) {
      setDisplay((prev) => prev.slice(0, -1) + op);
    } else {
      appendChar(op);
    }
  };

  const handleFunction = (fn: string) => {
    setDisplay((prev) => (prev === "0" ? `${fn}(` : `${prev}${fn}(`));
  };

  const handleConstant = (constant: string) => {
    appendChar(constant);
  };

  const clear = () => {
    setDisplay("0");
    setExpression("");
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const backspace = () => {
    setDisplay((prev) => {
      // Check if last chars form a function name like "sin("
      const fnMatch = prev.match(/(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs)\($/);
      if (fnMatch) return prev.slice(0, -fnMatch[0].length) || "0";
      return prev.length > 1 ? prev.slice(0, -1) : "0";
    });
  };

  const toggleSign = () => {
    setDisplay((prev) => {
      if (prev === "0") return prev;
      if (prev.startsWith("-")) return prev.slice(1);
      return `-${prev}`;
    });
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      setDisplay((val / 100).toString());
    } catch {
      setDisplay("Error");
    }
  };

  const handleSquare = () => {
    setDisplay((prev) => `(${prev})^2`);
  };

  const handleCube = () => {
    setDisplay((prev) => `(${prev})^3`);
  };

  const handleReciprocal = () => {
    setDisplay((prev) => `1/(${prev})`);
  };

  const handlePowerOf10 = () => {
    setDisplay((prev) => `10^(${prev})`);
  };

  const handlePowerOfE = () => {
    setDisplay((prev) => `e^(${prev})`);
  };

  const handleMemory = (action: "MC" | "MR" | "M+" | "M-") => {
    switch (action) {
      case "MC":
        setMemory(0);
        break;
      case "MR":
        setDisplay(memory.toString());
        break;
      case "M+":
        try {
          setMemory((prev) => prev + parseFloat(display));
        } catch {
          // ignore
        }
        break;
      case "M-":
        try {
          setMemory((prev) => prev - parseFloat(display));
        } catch {
          // ignore
        }
        break;
    }
  };

  const btnClass = "h-12 text-sm font-medium transition-all hover:scale-105 active:scale-95";
  const numBtn = cn(btnClass, "bg-secondary hover:bg-secondary/80");
  const opBtn = cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20");
  const fnBtn = cn(btnClass, "bg-muted hover:bg-muted/80 text-muted-foreground");
  const eqBtn = cn(btnClass, "bg-primary text-primary-foreground hover:bg-primary/90");

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mt-2">Scientific Calculator</h1>
        <p className="text-muted-foreground mt-1">Advanced calculations with trigonometric, logarithmic, and memory functions.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Calculator</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode(mode === "deg" ? "rad" : "deg")} className="text-xs">
                {mode.toUpperCase()}
              </Button>
              <Button variant={isSecond ? "default" : "outline"} size="sm" onClick={() => setIsSecond(!isSecond)} className="text-xs">
                2nd
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="text-xs text-muted-foreground text-right h-4">{expression}</div>
            <div className="text-3xl font-mono text-right overflow-x-auto whitespace-nowrap">{display}</div>
            {memory !== 0 && <div className="text-xs text-primary text-right">M = {memory}</div>}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {/* Row 1: Memory + Backspace */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleMemory("MC")}>MC</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleMemory("MR")}>MR</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleMemory("M+")}>M+</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleMemory("M-")}>M-</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={backspace}>⌫</Button>

            {/* Row 2: Trig + Power */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => isSecond ? handleFunction("asin") : handleFunction("sin")}>{isSecond ? "sin⁻¹" : "sin"}</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => isSecond ? handleFunction("acos") : handleFunction("cos")}>{isSecond ? "cos⁻¹" : "cos"}</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => isSecond ? handleFunction("atan") : handleFunction("tan")}>{isSecond ? "tan⁻¹" : "tan"}</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => isSecond ? handleFunction("log") : handleFunction("ln")}>{isSecond ? "log" : "ln"}</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleOperator("^")}>x^y</Button>

            {/* Row 3: Functions + Division */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => isSecond ? handleFunction("abs") : handleFunction("sqrt")}>{isSecond ? "|x|" : "√"}</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => appendChar("(")}>(</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => appendChar(")")}> )</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => appendChar("!")}>n!</Button>
            <Button variant="outline" size="sm" className={opBtn} onClick={() => handleOperator("÷")}>÷</Button>

            {/* Row 4: Constants + 7-9 + Multiply */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleConstant("π")}>π</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("7")}>7</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("8")}>8</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("9")}>9</Button>
            <Button variant="outline" size="sm" className={opBtn} onClick={() => handleOperator("×")}>×</Button>

            {/* Row 5: e + 4-6 + Subtract */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={() => handleConstant("e")}>e</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("4")}>4</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("5")}>5</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("6")}>6</Button>
            <Button variant="outline" size="sm" className={opBtn} onClick={() => handleOperator("-")}>−</Button>

            {/* Row 6: ± + 1-3 + Add */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={toggleSign}>±</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("1")}>1</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("2")}>2</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("3")}>3</Button>
            <Button variant="outline" size="sm" className={opBtn} onClick={() => handleOperator("+")}>+</Button>

            {/* Row 7: CE, 0, ., =, C */}
            <Button variant="outline" size="sm" className={fnBtn} onClick={clearEntry}>CE</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber("0")}>0</Button>
            <Button variant="outline" size="sm" className={numBtn} onClick={() => handleNumber(".")}>.</Button>
            <Button variant="outline" size="sm" className={eqBtn} onClick={evaluate}>=</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={clear}>C</Button>
          </div>

          {/* Extra functions row */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            <Button variant="outline" size="sm" className={fnBtn} onClick={handleSquare}>x²</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={handleCube}>x³</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={handleReciprocal}>1/x</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={handlePowerOf10}>10ˣ</Button>
            <Button variant="outline" size="sm" className={fnBtn} onClick={handlePowerOfE}>eˣ</Button>
          </div>

          {history.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">History</div>
                {history.map((h, i) => (
                  <div key={i} className="text-sm text-muted-foreground font-mono">{h}</div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
