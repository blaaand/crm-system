import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { UpdateFormulaDto } from './dto/update-formula.dto';
import { EvaluateFormulaDto } from './dto/evaluate-formula.dto';
import { evaluate } from 'mathjs';

@Injectable()
export class FormulasService {
  constructor(private prisma: PrismaService) {}

  async create(createFormulaDto: CreateFormulaDto, userId: string) {
    const { name, expression, description, active = true } = createFormulaDto;

    // Check if formula with same name exists
    const existingFormula = await this.prisma.formula.findUnique({
      where: { name },
    });

    if (existingFormula) {
      throw new ConflictException('المعادلة موجودة بالفعل');
    }

    // Validate expression syntax
    try {
      this.validateExpression(expression);
    } catch (error) {
      throw new BadRequestException('تعبير المعادلة غير صحيح: ' + error.message);
    }

    const formula = await this.prisma.formula.create({
      data: {
        name,
        expression,
        description,
        active,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return formula;
  }

  async findAll() {
    const formulas = await this.prisma.formula.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return formulas;
  }

  async findActive() {
    const formulas = await this.prisma.formula.findMany({
      where: { active: true },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return formulas;
  }

  async findOne(id: string) {
    const formula = await this.prisma.formula.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!formula) {
      throw new NotFoundException('المعادلة غير موجودة');
    }

    return formula;
  }

  async update(id: string, updateFormulaDto: UpdateFormulaDto, userId: string) {
    const formula = await this.prisma.formula.findUnique({
      where: { id },
    });

    if (!formula) {
      throw new NotFoundException('المعادلة غير موجودة');
    }

    const { name, expression, description, active } = updateFormulaDto;

    // Check if another formula with same name exists
    if (name && name !== formula.name) {
      const existingFormula = await this.prisma.formula.findUnique({
        where: { name },
      });

      if (existingFormula) {
        throw new ConflictException('المعادلة موجودة بالفعل');
      }
    }

    // Validate expression syntax if provided
    if (expression) {
      try {
        this.validateExpression(expression);
      } catch (error) {
        throw new BadRequestException('تعبير المعادلة غير صحيح: ' + error.message);
      }
    }

    const updatedFormula = await this.prisma.formula.update({
      where: { id },
      data: {
        ...updateFormulaDto,
        version: formula.version + 1,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedFormula;
  }

  async remove(id: string) {
    const formula = await this.prisma.formula.findUnique({
      where: { id },
    });

    if (!formula) {
      throw new NotFoundException('المعادلة غير موجودة');
    }

    await this.prisma.formula.delete({
      where: { id },
    });

    return { message: 'تم حذف المعادلة بنجاح' };
  }

  async evaluate(id: string, evaluateFormulaDto: EvaluateFormulaDto) {
    const formula = await this.findOne(id);

    if (!formula.active) {
      throw new BadRequestException('المعادلة غير مفعلة');
    }

    try {
      const result = this.evaluateExpression(formula.expression, evaluateFormulaDto.variables);
      
      return {
        formula: {
          id: formula.id,
          name: formula.name,
          expression: formula.expression,
        },
        variables: evaluateFormulaDto.variables,
        result,
        evaluatedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException('فشل في تنفيذ المعادلة: ' + error.message);
    }
  }

  async evaluateByName(name: string, variables: Record<string, any>) {
    const formula = await this.prisma.formula.findUnique({
      where: { name },
    });

    if (!formula) {
      throw new NotFoundException('المعادلة غير موجودة');
    }

    if (!formula.active) {
      throw new BadRequestException('المعادلة غير مفعلة');
    }

    try {
      const result = this.evaluateExpression(formula.expression, variables);
      
      return {
        formula: {
          id: formula.id,
          name: formula.name,
          expression: formula.expression,
        },
        variables,
        result,
        evaluatedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException('فشل في تنفيذ المعادلة: ' + error.message);
    }
  }

  async getFormulaStats() {
    const [totalFormulas, activeFormulas, inactiveFormulas] = await Promise.all([
      this.prisma.formula.count(),
      this.prisma.formula.count({ where: { active: true } }),
      this.prisma.formula.count({ where: { active: false } }),
    ]);

    const formulasByOwner = await this.prisma.formula.groupBy({
      by: ['ownerId'],
      _count: {
        ownerId: true,
      },
    });

    // Get owner details separately
    const ownerIds = formulasByOwner.map(item => item.ownerId);
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const ownerMap = new Map(owners.map(owner => [owner.id, owner]));

    return {
      totalFormulas,
      activeFormulas,
      inactiveFormulas,
      formulasByOwner: formulasByOwner.map(item => ({
        owner: ownerMap.get(item.ownerId),
        count: item._count.ownerId,
      })),
    };
  }

  private validateExpression(expression: string): void {
    try {
      // Parse the expression to check syntax
      evaluate(expression, {});
    } catch (error) {
      throw new Error('تعبير غير صحيح');
    }
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): any {
    try {
      // Create a safe evaluation context
      const context = {
        ...variables,
        // Add safe math functions
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        max: Math.max,
        min: Math.min,
        sqrt: Math.sqrt,
        pow: Math.pow,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log,
        exp: Math.exp,
        PI: Math.PI,
        E: Math.E,
      };

      return evaluate(expression, context);
    } catch (error) {
      throw new Error('فشل في تنفيذ المعادلة');
    }
  }
}
