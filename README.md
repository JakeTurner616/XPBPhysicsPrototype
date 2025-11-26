# Softbody Physics Prototype

This project presents a real-time deformable tire simulation engine prototype implemented in TypeScript, using an adaptation of the Extended Position-Based Dynamics (XPBD) method. The formulation follows the approach introduced by Macklin, Müller, and Chentanez (2016) in their work [“XPBD: Position-Based Simulation of Compliant Constrained Dynamics.”](https://matthias-research.github.io/pages/publications/XPBD.pdf). The simulation models a soft-body air filled tire composed of discretized particles connected through distance constraints and a global pressure constraint to approximate elastic radial behavior. The system additionally incorporates simple steering impulses, adjustable mass scaling, per-constraint stiffness controls, and ground interaction and rigid body resolved through an AABB contact model.

A short demo:

![Demo](docs/early-development-demo-phys.gif)

## Overview

The simulation uses a custom XPBD solver engine with the following extendable components:

* N equally spaced particles for the outer ring
* N particles for the inner ring
* Distance constraints for ring continuity
* Radial constraints linking inner and outer particles
* A single pressure constraint applied to the outer ring

## Cite This Project

If you use or modify this work in an academic or research context, please cite both this
implementation and the original XPBD paper.

@misc{turner2025xpbdtire,
  author       = {Turner, Jake},
  title        = {XPBD Tire Physics Playground},
  year         = {2025},
  howpublished = {\url{https://github.com/YOUR_USERNAME/YOUR_REPO}},
  note         = {Real-time deformable tire simulation based on XPBD}
}

@article{macklin2016xpbd,
  title   = {XPBD: Position-Based Simulation of Compliant Constrained Dynamics},
  author  = {Macklin, Miles and Müller, Matthias and Chentanez, Nuttapong},
  journal = {NVIDIA Research},
  year    = {2016},
  url     = {https://matthias-research.github.io/pages/publications/XPBD.pdf}
}

## License

If you use or modify the source code and plan to re-release it, it must be open source per the [GNU GPL 3.0 license](./LICENSE).
