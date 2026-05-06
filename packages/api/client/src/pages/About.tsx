import { PageHead } from '../components/molecules/PageHead/PageHead';
import './About.css';

export function About() {
  return (
    <div className="p7l-about">
      <PageHead eyebrow="Instance · v1.0.0" title="About p7l" />
      <p className="p7l-about__body">
        p7l is a plant care companion that keeps your watering schedule honest and your
        plants alive. Small, self-hosted, quietly obsessive.
      </p>
    </div>
  );
}
