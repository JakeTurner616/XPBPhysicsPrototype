---
layout: post
title: "Softbody Physics Prototype: A Real-Time XPBD Tire Simulation"
math: true
pinned: false
date: 2025-11-25 01:00:00 -0500
---

[This project](https://github.com/JakeTurner616/XPBPhysicsPrototype) presents a real-time open sourcedeformable tire simulation engine implemented in TypeScript, using an adaptation of the **Extended Position-Based Dynamics (XPBD)** method. The formulation follows the model introduced by **Macklin, Müller, and Chentanez (2016)** in their paper [“XPBD: Position-Based Simulation of Compliant Constrained Dynamics.”](https://matthias-research.github.io/pages/publications/XPBD.pdf)

The simulation models a soft-body, air-filled tire composed of discretized particles linked by distance constraints and a global pressure constraint. This allows the structure to behave elastically under deformation. The system also includes steering impulses, adjustable mass scaling, constraint stiffness controls, and analytically stable ground interaction using an AABB contact model.

A short demonstration:

![Demo](https://github.com/JakeTurner616/XPBPhysicsPrototype/raw/main/docs/early-development-demo-phys.gif)

Try out the demo [here](https://codepen.io/jaketurner616/pen/RNaQXjO).

---

# Overview

The tire model is constructed using a pair of concentric particle rings:

- \(N\) equally spaced particles on the **outer** ring  
- \(N\) particles forming an **inner** ring  
- Distance constraints maintain ring continuity  
- Radial constraints link each outer particle to its inner counterpart  
- A single pressure constraint maintains the target enclosed area  

The solver is based on XPBD, which extends traditional Position-Based Dynamics by incorporating *compliance* into constraints, producing stable soft-body behavior even at high stiffness values.

---

# XPBD Background

XPBD modifies PBD by replacing the traditional constraint projection rule with a formulation that adds **compliance**, allowing constraints to behave elastically.

A holonomic constraint is defined as:

$$
\begin{equation}
C(x) = 0
\end{equation}
$$

XPBD updates positions using:

$$
\begin{equation}
x^{t+1} = x + \Delta x
\end{equation}
$$

Where the positional correction for a particle \(i\) is:

$$
\begin{equation}
\Delta x_i =
-\frac{
  w_i \nabla C_i
}{
  \sum_j w_j \|\nabla C_j\|^2 + \alpha / \Delta t^2
}
\left( C(x) + \alpha \lambda^{*} \right)
\end{equation}
$$

**Where:**

$$ w_i = \text{inverse mass} $$

$$ \alpha = \text{compliance} $$

$$ \lambda^{*} = \text{previous Lagrange multiplier} $$

$$ \Delta t = \text{timestep} $$

This yields a more stable constraint system where stiffness is determined by \(\alpha\), enabling both rigid and soft constraints in the same solver.

# Distance Constraint

For two particles \(a\) and \(b\) with rest length \(L_0\):

$$
\begin{equation}
C(x) = \|x_b - x_a\| - L_0
\end{equation}
$$

Gradient:

$$
\begin{equation}
\nabla C = \frac{x_b - x_a}{\|x_b - x_a\|}
\end{equation}
$$

The XPBD correction becomes:

$$
\begin{equation}
\Delta x_a = -w_a \lambda \nabla C
\end{equation}
$$

$$
\begin{equation}
\Delta x_b = +w_b \lambda \nabla C
\end{equation}
$$

**Where:**

$$ w_a = \text{inverse mass of particle } a $$

$$ w_b = \text{inverse mass of particle } b $$

$$ \lambda = \text{XPBD Lagrange multiplier} $$

$$ L_0 = \text{rest length} $$

This governs all outer-ring, inner-ring, and radial constraints.

# Pressure Constraint

The pressure constraint preserves the polygon area of the outer ring.  
The signed area of an \(N\)-vertex polygon is:

$$
\begin{equation}
A = \frac{1}{2}
\sum_{i=1}^{N}
\left( x_i y_{i+1} - x_{i+1} y_i \right)
\end{equation}
$$

Let \(A_0\) be the target (rest) area computed on initialization.

The constraint is then:

$$
\begin{equation}
C(x) = A - A_0
\end{equation}
$$

XPBD applies a correction based on the gradient of the polygon area with respect to each vertex:

$$
\begin{equation}
\nabla_{x_i} C =
\frac{1}{2}
\begin{pmatrix}
y_{i+1} - y_{i-1} \\
x_{i-1} - x_{i+1}
\end{pmatrix}
\end{equation}
$$

**Where:**

$$ A = \text{current polygon area} $$

$$ A_0 = \text{rest (target) polygon area} $$

$$ \nabla_{x_i} C = \text{area gradient at vertex } i $$

The correction is applied to each particle with its inverse mass and XPBD compliance term.  
This behaves like an internal pneumatic pressure that maintains radial stiffness.

# Contact Resolution (AABB Model)

Ground and rigid-body interaction uses an analytically stable AABB contact.  
For a particle \(p\) and a box region, penetration is resolved by projecting \(p\) outward along the smallest overlap direction:

$$
\begin{equation}
p' = p + n \, d
\end{equation}
$$

**Where:**

$$ n = \text{collision normal} $$

$$ d = \text{penetration depth} $$

Velocities are recomputed after constraint solving using:

$$
\begin{equation}
v = \frac{x^{t+1} - x^{t}}{\Delta t}
\end{equation}
$$

**Where:**

$$ v = \text{velocity after constraint solving} $$

$$ x^{t+1} = \text{new position} $$

$$ x^{t} = \text{previous position} $$

$$ \Delta t = \text{timestep} $$

This approach yields non-jitter contact without requiring impulses or friction modeling.

---

# Cite This Project

If you use or modify this work in an academic or research context, please cite both this implementation and the original XPBD paper:
