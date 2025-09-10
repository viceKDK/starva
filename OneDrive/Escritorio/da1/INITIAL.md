# PROJECT INITIAL SETUP

## PROJECT OVERVIEW
Este es un proyecto académico de Diseño de Aplicaciones 1 (DA1) del año 2025, Obligatorio 1.

## KEY PROJECT FILES

### Configuration & Guidelines
- **Development Guidelines**: `AI_GUIDELINES.md` - Comprehensive best practices and coding standards
- **Claude Code Permissions**: `.claude_permissions.json` - Tool permissions configuration

### Documentation & Requirements  
- **Assignment Specification**: `DA1.2025.1.Obligatorio 1.pdf` - Official project requirements
- **Evaluation Rubric**: `guia de correcion.md` - Grading criteria and expectations

### Architecture Documentation
- **Complete Architecture Specification**: `docs/architecture.md` - Full system architecture with Clean Architecture patterns, Entity design, Domain services, and UML diagrams
- **Product Requirements Document**: `docs/prd.md` - Comprehensive functional/non-functional requirements, user stories, and acceptance criteria  
- **Technical Brief**: `docs/brief.md` - Technical brief and system overview
- **Frontend Specifications**: `docs/front-end-spec.md` - UI/UX design guidelines and component specifications
- **UI Generation Prompts**: `docs/ui-generation-prompts.md` - Specific prompts and guidelines for UI component generation

### Project Structure
- **BlazorApp1/**: Main application folder with organized architecture
  - **Data/**: Domain entities and models
  - **Services/**: Business logic and application services
  - **Repositories/**: Data access layer (Repository pattern)
  - **Interfaces/**: Service contracts and abstractions
  - **Helpers/**: Utility classes and helper functions
  - **Configuration/**: Application configuration and settings
  - **Components/**: Blazor UI components
  - **wwwroot/**: Static files and client resources

## DEVELOPMENT STANDARDS

### Architecture Patterns
- Reference implementation patterns: `AI_GUIDELINES.md#design-patterns`
- SOLID principles guide: `AI_GUIDELINES.md#solid-principles-quick-reference`
- GRASP principles: `AI_GUIDELINES.md#grasp-principles`

### Code Quality Requirements
- Clean Code standards: `AI_GUIDELINES.md#clean-code-principles`
- Error handling patterns: `AI_GUIDELINES.md#error-handling-best-practices`
- Testing methodology: `AI_GUIDELINES.md#testing-standards`

### Data Access Patterns
- Entity Framework inheritance: `AI_GUIDELINES.md#entity-framework-core-inheritance`
- DTO implementation: `AI_GUIDELINES.md#data-transfer-objects-dtos`
- Loading strategies: `AI_GUIDELINES.md#data-loading-strategies`

## EVALUATION CRITERIA
Based on `guia de correcion.md`:
- **Functionality (6 pts)**: Complete feature implementation and usability
- **Design & Documentation (6 pts)**: UML diagrams, design justification, test coverage
- **Code Quality & Methodology (8 pts)**: TDD evidence, Clean Code compliance, design consistency

## GIT WORKFLOW REQUIREMENTS
- **Mandatory**: Follow Git workflow as specified in `AI_GUIDELINES.md#git-workflow-requirements`
- **Branching**: Use feature/bugfix/hotfix naming conventions
- **Commits**: Atomic commits with clear messages
- **Pull Requests**: Required for all changes with code review

## TECHNOLOGY STACK
- **Framework**: .NET Core 8 Blazor Server
- **Database**: Entity Framework Core (prepared for future iterations)
- **Storage**: In-memory collections (first iteration)
- **Testing**: MSTest with TDD methodology
- **Version Control**: Git with GitFlow workflow

## DEVELOPMENT APPROACH
1. **Start with TDD**: Write tests first as per evaluation criteria
2. **Follow SOLID/GRASP**: Apply principles from guidelines
3. **Use Design Patterns**: Implement Strategy, Facade, Factory patterns
4. **Document thoroughly**: UML diagrams and design justification required
5. **Code reviews**: All changes through pull requests

## KEY SUCCESS FACTORS
- **Complete functionality**: Implement all required features per PRD
- **Clean architecture**: Follow 4-layer Clean Architecture separation
- **Comprehensive testing**: Evidence TDD usage through commits
- **Quality documentation**: Professional UML diagrams with explanations
- **Standards compliance**: Follow all guidelines in `AI_GUIDELINES.md`
- **Algorithm implementation**: Duplicate detection with fixed thresholds (τ_alert=0.60, τ_dup=0.75)

---

**Note**: All development must adhere to standards in `AI_GUIDELINES.md`. Refer to `docs/architecture.md` for complete system design and `docs/prd.md` for detailed requirements. Project structure has been organized following Clean Architecture principles with proper separation of concerns.